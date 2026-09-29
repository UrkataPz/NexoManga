import { createClient } from "@/lib/supabase/server";
import { firstOf } from "@/lib/utils";



// fecha en formato "13 de agosto de 2020"
function toDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

// nombres de usuario de una lista de ids (id → nombre)
async function getUsernames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase.from("user_profiles").select("id, username").in("id", userIds);

  return new Map((data ?? []).map((row) => [row.id, row.username]));
}

// títulos de una lista de obras (id -> título)
async function getWorkTitles(workIds: string[]): Promise<Map<string, string>> {
  if (workIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data } = await supabase.from("works").select("id, title").in("id", workIds);

  return new Map((data ?? []).map((row) => [row.id, row.title]));
}

export interface AdminCounts {
  pendingWorks: number;
  pendingReports: number;
  activeSubscriptions: number;
}

// inicio del admin
export async function getAdminCounts(): Promise<AdminCounts> {
  const supabase = await createClient();

  const [works, reports, subscriptions] = await Promise.all([
    supabase.from("works").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .neq("plan", "free"),
  ]);

  return {
    pendingWorks: works.count ?? 0,
    pendingReports: reports.count ?? 0,
    activeSubscriptions: subscriptions.count ?? 0,
  };
}

export interface PendingWork {
  id: string;
  title: string;
  author: string;
  dateLabel: string;
}

// obras que esperan revisión 
export async function getPendingWorks(): Promise<PendingWork[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("works")
    .select("id, title, created_at, work_authors(user_profiles(username))")
    .eq("moderation_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((work) => {
    const author = firstOf(firstOf(work.work_authors)?.user_profiles); //sacamo el autor de su obra, y luego tomamos el parfil del autor
    return {
      id: work.id,
      title: work.title,
      author: author?.username ?? "—",
      dateLabel: toDateLabel(work.created_at),
    };
  });
}

export interface PendingReport {
  id: string;
  reporter: string;
  targetLabel: string;
  targetHref: string;
  reason: string;
  dateLabel: string;
}

// reportes sin revisar, quién reportó y qué (una obra o un usuario)
export async function getPendingReports(): Promise<PendingReport[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .select("id, reason, created_at, reporter_id, reported_work_id, reported_user_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  // junta los ids de personas y obras para buscar sus nombres de una sola vez
  const userIds: string[] = [];
  const workIds: string[] = [];
  for (const report of data) { //recorre los reportes pendientes
    userIds.push(report.reporter_id); //registramos quien reportó
    if (report.reported_user_id) userIds.push(report.reported_user_id); //si reportaron a user se anota el user
    if (report.reported_work_id) workIds.push(report.reported_work_id); //si reportaron una obra se anota la obra
  }
  const [usernames, titles] = await Promise.all([getUsernames(userIds), getWorkTitles(workIds)]); //buscamos el user y la obra reportada

  return data.map((report) => {
    const isWork = report.reported_work_id !== null; //el reportado es una obra?, si no es un usuario
    return {
      id: report.id,
      reporter: usernames.get(report.reporter_id) ?? "—",
      targetLabel: isWork
        ? `Obra: ${titles.get(report.reported_work_id) ?? "—"}`
        : `Usuario: ${usernames.get(report.reported_user_id) ?? "—"}`,
      targetHref: isWork ? `/obra/${report.reported_work_id}` : `/comunidad/autor/${report.reported_user_id}`,
      reason: report.reason,
      dateLabel: toDateLabel(report.created_at),
    };
  });
}

export interface AdminLogEntry {
  id: string;
  admin: string;
  action: string;
  note: string | null;
  dateLabel: string;
}

// las últimas 50 acciones del admin
export async function getAdminLog(): Promise<AdminLogEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_action_logs")
    .select("id, admin_id, action, note, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    return [];
  }

  const usernames = await getUsernames(data.map((row) => row.admin_id));

  return data.map((row) => ({
    id: row.id,
    admin: usernames.get(row.admin_id) ?? "—",
    action: row.action,
    note: row.note,
    dateLabel: new Date(row.created_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" }),
  }));
}

export interface Payout {
  id: string;
  recipient: string;
  typeLabel: string;
  amount: number;
  dateLabel: string;
}

// los últimos pagos del reparto (a autores y traductores)
export async function getRecentPayouts(): Promise<Payout[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, amount, target_user_id, created_at")
    .in("type", ["global_fund", "translator_payment"])
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    return [];
  }

  const usernames = await getUsernames(data.map((row) => row.target_user_id));

  return data.map((row) => ({
    id: row.id,
    recipient: usernames.get(row.target_user_id) ?? "—",
    typeLabel: row.type === "global_fund" ? "Autor" : "Traducción",
    amount: Number(row.amount),
    dateLabel: toDateLabel(row.created_at),
  }));
}

// --- lo que usa Calcular reparto ---

// fecha del último reparto, null si nunca se hizo
export async function getLastPayoutDate(): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("transactions")
    .select("created_at")
    .in("type", ["global_fund", "translator_payment"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.created_at ?? null;
}

// lo cobrado en suscripciones desde una fecha (si es null, desde siempre)
export async function getSubscriptionIncomeSince(since: string | null): Promise<number> {
  const supabase = await createClient();

  let query = supabase.from("transactions").select("amount").eq("type", "subscription").eq("status", "paid");
  if (since) query = query.gt("created_at", since);
  const { data, error } = await query;

  if (error) console.error(error);
  return (data ?? []).reduce((total, row) => total + Number(row.amount), 0);
}

export interface PayoutReading {
  value: number;
  authorId: string | null;
  // si fue una traducción: quién la subió y su grupo (null = se leyó el original)
  translatorId: string | null;
  groupId: string | null;
}

// lecturas válidas desde una fecha, con el autor de la obra y, si fue traducción, quién la tradujo
export async function getValidReadingsSince(since: string | null): Promise<PayoutReading[]> { // recibe la fecha del último reparto (null = nunca hubo) y devuelve la lista de lecturas a pagar
  const supabase = await createClient(); // conexión con la sesión del admin: la RLS de reading_progress le deja ver las lecturas de todos

  let query = supabase // "let" y no "const" porque abajo se le puede agregar un filtro más
    .from("reading_progress") // la "boleta final" de cada lectura: una fila por usuario y capítulo
    .select(
      "value, chapters(works(work_authors(user_id))), chapter_translations(translation_jobs(translator_id, group_id))", // value = cuánto vale la lectura · camino 1: lectura → capítulo → obra → su autor · camino 2 (solo si se leyó traducida): lectura → traducción → su trabajo → quién la subió y de qué grupo
    )
    .eq("valid_reading", true); // solo las lecturas válidas (cobertura ≥ 80 % y tiempo mínimo)
  if (since) query = query.gt("validated_at", since); // si ya hubo un reparto, solo las validadas DESPUÉS (gt = mayor que): así ninguna lectura se paga dos veces
  const { data, error } = await query; // manda la consulta a Supabase

  if (error) { // si la consulta falló...
    console.error(error); // ...el error real sale en la terminal de pnpm dev
    return []; // lista vacía: el reparto dirá "No hay lecturas válidas"
  }

  return data.map((row) => { // convierte cada fila anidada de Supabase en un objeto simple
    const work = firstOf(firstOf(row.chapters)?.works); // la obra de la lectura; firstOf porque Supabase manda algunas relaciones como objeto y otras como lista (trampa 14)
    const author = firstOf(work?.work_authors); // el autor de esa obra (una obra = un autor); el ?. evita romperse si el camino viene vacío
    const job = firstOf(firstOf(row.chapter_translations)?.translation_jobs); // el trabajo de traducción; queda undefined si se leyó el original
    return {
      value: Number(row.value ?? 0), // cuánto vale la lectura, como número (0 si viene vacío). Ej: cap. 5 de Ana = 50
      authorId: author?.user_id ?? null, // a quién se le paga la obra (null si la obra no tiene autor)
      translatorId: job?.translator_id ?? null, // quién subió la traducción; null = se leyó el original
      groupId: job?.group_id ?? null, // su grupo (ej. Scan Luna); null = traductor suelto u original
    };
  });
}

export interface GroupSplit {
  leaderId: string | null;
  shares: { userId: string; pct: number }[];
}

// porcentajes de cada miembro de un grupo y quién es su líder
export async function getGroupSplit(groupId: string): Promise<GroupSplit> {
  const supabase = await createClient();

  const [{ data: shares }, { data: leader }] = await Promise.all([
    supabase.rpc("get_group_shares", { p_group_id: groupId }), //obtenemos los porcentajes porque están ocultos, y lo hacemos con llamada remota
    supabase
      .from("translation_group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("role", "leader")
      .maybeSingle(),
  ]);

  return { // Ej. Scan Luna → { leaderId: Carla, shares: [Carla 0, Dani 30, Eli 20] }
    leaderId: leader?.user_id ?? null, // el id del líder; null si el grupo quedó vacío (sin líder)
    shares: ((shares ?? []) as { member_id: string; share: number | null }[]).map((row) => ({ // shares ?? [] = si la función no devolvió nada, lista vacía · "as" le dice a TypeScript cómo viene cada fila (no hay tipos generados de nuestras funciones) · map cambia cada fila de la base a nuestro formato
      userId: row.member_id, // member_id (nombre en la base) → userId (nombre en el código)
      pct: Number(row.share ?? 0), // share → pct: el porcentaje como número (0 si viene vacío; el líder casi siempre tiene 0, su parte es "lo que sobra")
    })),
  };
}
