import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { firstOf } from "@/lib/utils";
import { isWorkAuthor } from "@/lib/works_queries";
import type { WorkStatus, WorkType } from "@/features/works/work-options";
import { getChapterState, type ChapterAccess, type ChapterState } from "@/features/chapters/chapter-options";

// consultas e inserciones de Mi panel (autor y traductor); sin "use server" a propósito

export interface NewWork {
  title: string;
  alternativeTitles: string[];
  type: WorkType;
  status: WorkStatus;
  synopsis: string | null;
  genreIds: string[];
}

type InsertWorkResult = { workId: string; error?: undefined } | { error: string; workId?: undefined };

// crea la obra, registra al usuario como autor principal y guarda sus géneros
export async function insertWork(userId: string, work: NewWork): Promise<InsertWorkResult> {
  const supabase = await createClient();
  const workId = randomUUID();

  const { error: workError } = await supabase.from("works").insert({
    id: workId,
    title: work.title,
    alternative_titles: work.alternativeTitles.length > 0 ? work.alternativeTitles : null,
    type: work.type,
    status: work.status,
    synopsis: work.synopsis,
  });
  if (workError) return { error: workError.message };

  const { error: authorError } = await supabase
    .from("work_authors")
    .insert({ work_id: workId, user_id: userId });
  if (authorError) return { error: authorError.message };

  if (work.genreIds.length > 0) {
    const { error: genresError } = await supabase
      .from("work_genres")
      .insert(work.genreIds.map((genreId) => ({ work_id: workId, genre_id: genreId })));
    if (genresError) return { error: genresError.message };
  }

  return { workId };
}

// guarda los cambios de una obra y reemplaza sus géneros
export async function updateWorkRow(workId: string, work: NewWork): Promise<string | null> {
  const supabase = await createClient();

  const { error: workError } = await supabase
    .from("works")
    .update({
      title: work.title,
      alternative_titles: work.alternativeTitles.length > 0 ? work.alternativeTitles : null,
      type: work.type,
      status: work.status,
      synopsis: work.synopsis,
    })
    .eq("id", workId);
  if (workError) return workError.message;

  const { error: deleteError } = await supabase.from("work_genres").delete().eq("work_id", workId);
  if (deleteError) return deleteError.message;

  if (work.genreIds.length > 0) {
    const { error: genresError } = await supabase
      .from("work_genres")
      .insert(work.genreIds.map((genreId) => ({ work_id: workId, genre_id: genreId })));
    if (genresError) return genresError.message;
  }

  return null;
}

// guarda la URL de la portada en la obra
export async function setWorkCover(workId: string, coverUrl: string): Promise<string | null> {
  const supabase = await createClient();

  const { error } = await supabase.from("works").update({ cover_url: coverUrl }).eq("id", workId);

  return error?.message ?? null;
}

// borra una obra recién creada cuando algo falló a medio camino
export async function deleteWork(workId: string): Promise<void> {
  const supabase = await createClient();

  await supabase.from("work_genres").delete().eq("work_id", workId);
  await supabase.from("works").delete().eq("id", workId);
}

export interface MyWork {
  id: string;
  title: string;
  moderationStatus: string;
  lastChapterNumber: number | null;
}

// trae las obras del autor con el número de su último capítulo
export async function getMyWorks(userId: string): Promise<MyWork[]> {
  const supabase = await createClient();

  const { data: authorRows } = await supabase
    .from("work_authors")
    .select("work_id")
    .eq("user_id", userId);

  if (!authorRows || authorRows.length === 0) return [];

  const { data, error } = await supabase
    .from("works")
    .select("id, title, moderation_status, chapters(chapter_number)")
    .in("id", authorRows.map((row) => row.work_id))
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((work) => {
    const numbers = work.chapters.map((chapter) => Number(chapter.chapter_number));
    return {
      id: work.id,
      title: work.title,
      moderationStatus: work.moderation_status,
      lastChapterNumber: numbers.length > 0 ? Math.max(...numbers) : null,
    };
  });
}

export interface EditableWork extends NewWork {
  id: string;
  coverUrl: string | null;
  moderationStatus: string;
  moderationNote: string | null;
}

// trae una obra del autor con todos sus datos, para el formulario de modificar
export async function getMyWorkForEdit(userId: string, workId: string): Promise<EditableWork | null> {
  if (!(await isWorkAuthor(userId, workId))) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .select(
      "id, title, alternative_titles, type, status, synopsis, cover_url, moderation_status, moderation_note, work_genres(genre_id)",
    )
    .eq("id", workId)
    .maybeSingle();

  if (error) console.error(error);
  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    alternativeTitles: data.alternative_titles ?? [],
    type: data.type,
    status: data.status,
    synopsis: data.synopsis,
    genreIds: data.work_genres.map((row) => row.genre_id),
    coverUrl: data.cover_url,
    moderationStatus: data.moderation_status,
    moderationNote: data.moderation_note,
  };
}

export interface ChapterDetails {
  chapterNumber: number;
  title: string | null;
  language: string;
  access: ChapterAccess;
  contentType: "images" | "pdf";
}

export interface NewChapter extends ChapterDetails {
  workId: string;
  pageCount: number;
}

type InsertChapterResult = { chapterId: string; error?: undefined } | { error: string; chapterId?: undefined };

// crea el capítulo como borrador, todavía sin páginas
export async function insertChapterDraft(chapter: NewChapter): Promise<InsertChapterResult> {
  const supabase = await createClient();
  const chapterId = randomUUID();

  const { error } = await supabase.from("chapters").insert({
    id: chapterId,
    work_id: chapter.workId,
    chapter_number: chapter.chapterNumber,
    title: chapter.title,
    original_language: chapter.language,
    content_type: chapter.contentType,
    content: [],
    page_count: chapter.pageCount,
    publication_status: "draft",
    publication_date: null,
    is_vln: chapter.access === "vln",
    is_premium: chapter.access === "premium",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `Ya existe el capítulo ${chapter.chapterNumber} en esta obra.` };
    }
    return { error: error.message };
  }

  return { chapterId };
}

// guarda número, título, idioma, acceso y tipo de contenido de un capítulo existente
export async function updateChapterRow(chapterId: string, details: ChapterDetails): Promise<string | null> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("chapters")
    .update({
      chapter_number: details.chapterNumber,
      title: details.title,
      original_language: details.language,
      is_vln: details.access === "vln",
      is_premium: details.access === "premium",
      content_type: details.contentType,
    })
    .eq("id", chapterId);

  if (error?.code === "23505") return `Ya existe el capítulo ${details.chapterNumber} en esta obra.`;
  return error?.message ?? null;
}

// revisa si el usuario es autor de la obra a la que pertenece el capítulo
export async function isChapterAuthor(userId: string, chapterId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: chapter } = await supabase
    .from("chapters")
    .select("work_id")
    .eq("id", chapterId)
    .maybeSingle();

  if (!chapter) return false;

  const { data: author } = await supabase
    .from("work_authors")
    .select("user_id")
    .eq("work_id", chapter.work_id)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(author);
}

export interface MyChapter {
  id: string;
  workId: string;
  workTitle: string;
  number: number;
  title: string | null;
  state: ChapterState;
}

// trae los capítulos de las obras del autor (todos, o solo los que no están publicados)
export async function getMyChapters(userId: string, onlyDrafts = false): Promise<MyChapter[]> {
  const supabase = await createClient();

  const { data: authorRows } = await supabase
    .from("work_authors")
    .select("work_id")
    .eq("user_id", userId);

  if (!authorRows || authorRows.length === 0) return [];

  let query = supabase
    .from("chapters")
    .select("id, work_id, chapter_number, title, publication_status, publication_date, works(title)")
    .in("work_id", authorRows.map((row) => row.work_id));

  if (onlyDrafts) query = query.neq("publication_status", "published");

  const { data, error } = await query.order("chapter_number", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    workId: row.work_id,
    workTitle: firstOf(row.works)?.title ?? "Obra",
    number: Number(row.chapter_number),
    title: row.title,
    state: getChapterState(row.publication_status, row.publication_date),
  }));
}

export interface EditableChapter extends ChapterDetails {
  id: string;
  workId: string;
  workTitle: string;
  state: ChapterState;
  publicationDate: string | null;
  pageCount: number;
  pageUrls: string[];
}

// trae un capítulo del autor con sus datos y páginas actuales, para modificarlo
export async function getMyChapterForEdit(userId: string, chapterId: string): Promise<EditableChapter | null> {
  if (!(await isChapterAuthor(userId, chapterId))) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapters")
    .select(
      "id, work_id, chapter_number, title, original_language, content_type, is_vln, is_premium, publication_status, publication_date, page_count, content, works(title)",
    )
    .eq("id", chapterId)
    .maybeSingle();

  if (error) console.error(error);
  if (error || !data) return null;

  const access: ChapterAccess = data.is_premium ? "premium" : data.is_vln ? "vln" : "free";
  const pageUrls = Array.isArray(data.content)
    ? data.content.filter((url: unknown): url is string => typeof url === "string")
    : [];

  return {
    id: data.id,
    workId: data.work_id,
    workTitle: firstOf(data.works)?.title ?? "Obra",
    chapterNumber: Number(data.chapter_number),
    title: data.title,
    language: data.original_language,
    access,
    contentType: data.content_type,
    state: getChapterState(data.publication_status, data.publication_date),
    publicationDate: data.publication_date,
    pageCount: data.page_count,
    pageUrls,
  };
}

// estado actual de publicación de un capítulo (para saber si ya estaba publicado)
export async function getChapterPublication(
  chapterId: string,
): Promise<{ state: ChapterState; publicationDate: string | null } | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("chapters")
    .select("publication_status, publication_date")
    .eq("id", chapterId)
    .maybeSingle();

  if (!data) return null;
  return {
    state: getChapterState(data.publication_status, data.publication_date),
    publicationDate: data.publication_date,
  };
}

// revisa en Storage que estén todas las páginas y devuelve sus URLs en orden
// (bucket: "chapter-pages" para capítulos, "chapter-translation-pages" para traducciones)
export async function getChapterPageUrls(
  chapterId: string,
  pageCount: number,
  bucket = "chapter-pages",
): Promise<string[] | null> {
  const supabase = await createClient();

  const { data: files, error } = await supabase.storage
    .from(bucket)
    .list(chapterId, { limit: 1000 });

  if (error || !files) return null;

  const fileNames = new Set(files.map((file) => file.name));
  const version = Date.now();
  const urls: string[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    if (!fileNames.has(`pg-${pageNumber}.webp`)) return null;
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(`${chapterId}/pg-${pageNumber}.webp`);
    // ?v= obliga al navegador a bajar la imagen de nuevo si se reemplazó
    urls.push(`${data.publicUrl}?v=${version}`);
  }

  return urls;
}

// guarda las páginas del capítulo y su estado de publicación
export async function saveChapterContent(
  chapterId: string,
  pageUrls: string[],
  status: "draft" | "published",
  publicationDate: string | null,
): Promise<string | null> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("chapters")
    .update({
      content: pageUrls,
      page_count: pageUrls.length,
      publication_status: status,
      publication_date: publicationDate,
    })
    .eq("id", chapterId);

  return error?.message ?? null;
}
