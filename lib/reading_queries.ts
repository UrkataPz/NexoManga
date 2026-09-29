import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PageSize } from "@/features/reader/reader-rules";



export interface ReadingSession {
  userId: string;
  chapterId: string;
  // traducción que se está leyendo (null = idioma original)
  translationId: string | null;
  openedAt: string;
}

export interface PageReport {
  page: number;
  activeMs: number;
  idleMs: number;
  hiddenMs: number;
  seen: number;
}

export interface SessionStats {
  activeMs: number;
  seenByPage: Map<number, number>;
}

// abre una sesión de lectura: guarda "abrió" con la hora del servidor y devuelve su id
export async function openReadingSession(
  userId: string,
  chapterId: string,
  translationId: string | null,
): Promise<string | null> {
  const supabase = createAdminClient();
  const sessionId = randomUUID();

  const { error } = await supabase.from("reading_events").insert({
    user_id: userId,
    chapter_id: chapterId,
    chapter_translation_id: translationId,
    session_id: sessionId,
    event_type: "chapter_opened",
  });

  if (error) {
    console.error(error);
    return null;
  }

  //anota la ultima vez que lo abrió
  await supabase
    .from("reading_progress")
    .upsert( //si no existe la fila la crea, si ya existe la actualiza
      { user_id: userId, chapter_id: chapterId, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,chapter_id" }, //revisa si hay un registro con el mismo user id y con chapter id, si choca actualiza
    );

  return sessionId;
}

// busca la sesión: de quién es, qué capítulo y cuándo se abrió
export async function getReadingSession(sessionId: string): Promise<ReadingSession | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("reading_events")
    .select("user_id, chapter_id, chapter_translation_id, created_at")
    .eq("session_id", sessionId)
    .eq("event_type", "chapter_opened")
    .maybeSingle();

  if (!data) return null;
  return {
    userId: data.user_id,
    chapterId: data.chapter_id,
    translationId: data.chapter_translation_id,
    openedAt: data.created_at,
  };
}

// suma el tiempo activo de la sesión y el máximo "visto" de cada página
export async function getSessionStats(sessionId: string): Promise<SessionStats> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("reading_events")
    .select("page_number, scroll_pct, ms_visible")
    .eq("session_id", sessionId)
    .eq("event_type", "page_viewed");

  let activeMs = 0;
  const seenByPage = new Map<number, number>();

  for (const row of data ?? []) {
    activeMs += row.ms_visible ?? 0; //suma el tiempo activo
    const seen = Number(row.scroll_pct ?? 0) / 100; //pasamos el porcentaje guardado a franciion (de 0 a 1)
    seenByPage.set(row.page_number, Math.max(seenByPage.get(row.page_number) ?? 0, seen)); //guarda el maximo visto por cada pagina en el map
  }

  return { activeMs, seenByPage };
}

// guarda el tiempo de cada página que llegó en un latido
export async function insertPageViews(session: ReadingSession, sessionId: string, reports: PageReport[]): Promise<void> {
  if (reports.length === 0) return;

  const supabase = createAdminClient();

  const { error } = await supabase.from("reading_events").insert(
    reports.map((report) => ({
      user_id: session.userId,
      chapter_id: session.chapterId,
      chapter_translation_id: session.translationId,
      session_id: sessionId,
      event_type: "page_viewed",
      page_number: report.page,
      scroll_pct: Math.round(report.seen * 100),
      ms_visible: report.activeMs,
      idle_ms: report.idleMs,
      tab_hidden_ms: report.hiddenMs,
    })),
  );

  if (error) console.error(error);
}

// revisa si el usuario ya tenía una lectura válida de este capítulo
export async function isAlreadyValid(userId: string, chapterId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("reading_progress")
    .select("valid_reading")
    .eq("user_id", userId)
    .eq("chapter_id", chapterId)
    .maybeSingle();

  return data?.valid_reading === true;
}

// cuántas lecturas válidas hizo el usuario desde cierta hora 
export async function countValidReadingsSince(userId: string, sinceIso: string): Promise<number> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("reading_progress")
    .select("id", { count: "exact", head: true })  //extrae cuantas filas son
    .eq("user_id", userId)
    .gte("validated_at", sinceIso);

  return count ?? 0;
}

// guarda la lectura válida, evento "terminó", mas el valor para el pago
export async function saveValidReading(
  session: ReadingSession,
  sessionId: string,
  coverage: number,
  value: number,
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("reading_events").insert({
    user_id: session.userId,
    chapter_id: session.chapterId,
    chapter_translation_id: session.translationId,
    session_id: sessionId,
    event_type: "chapter_completed",
  });

  const { error } = await supabase.from("reading_progress").upsert(
    {
      user_id: session.userId,
      chapter_id: session.chapterId,
      // con qué traducción se hizo la lectura válida: de aquí sale el porcentaje de pago para el traductor
      chapter_translation_id: session.translationId,
      read: true,
      valid_reading: true,
      rvs_score: Math.min(0.999, Math.round(coverage * 1000) / 1000),
      value,
      validated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,chapter_id" },
  );

  if (error) console.error(error);
}

// guarda el ancho y alto de una página del capítulo (lo usa la subida de páginas)
export async function saveChapterPageSize(chapterId: string, pageNumber: number, size: PageSize): Promise<void> {
  const supabase = createAdminClient();

  const { data } = await supabase.from("chapters").select("page_sizes").eq("id", chapterId).maybeSingle();
  const sizes: (PageSize | null)[] = Array.isArray(data?.page_sizes) ? [...data.page_sizes] : []; //si hay lista se copia si no es capitulo nuevo y empieza vacio
  sizes[pageNumber - 1] = size; //reordenamos, como se cuenta desde 0, la pagina 1 sería la 0

  const { error } = await supabase
    .from("chapters")
    .update({ page_sizes: Array.from(sizes, (entry) => entry ?? null) }) //si hay posiciones vacías se rellena con null
    .eq("id", chapterId);

  if (error) console.error(error);
}

// recorta paginas para cuando se reemplazan 6 paginas por 5, sobran 2 espacios, asi que se actualizan los pesos
export async function trimChapterPageSizes(chapterId: string, pageCount: number): Promise<void> {
  const supabase = createAdminClient();

  const { data } = await supabase.from("chapters").select("page_sizes").eq("id", chapterId).maybeSingle();
  if (!Array.isArray(data?.page_sizes) || data.page_sizes.length <= pageCount) return;

  await supabase
    .from("chapters")
    .update({ page_sizes: data.page_sizes.slice(0, pageCount) })
    .eq("id", chapterId);
}
