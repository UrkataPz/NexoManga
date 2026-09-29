import { createClient } from "@/lib/supabase/server";
import { firstOf } from "@/lib/utils";
import { getMyGroup } from "@/lib/translations_queries";
import type { PageSize } from "@/features/reader/reader-rules";

export interface ReaderChapter {  //molde para el lector
  id: string;
  number: number;
  title: string | null;
  workId: string;
  workTitle: string;
  coverUrl: string | null;
  isVln: boolean;
  isPremium: boolean;
  originalLanguage: string;
  pageCount: number;
  pageSizes: PageSize[] | null;
}

export interface ChapterPages {  //molde para la url del idioma que se muestra y el id de la traducción
  urls: string[];
  // idioma de la obra que se lee junto con su id para las metricas
  language: string;
  translationId: string | null;
}

export interface ChapterNavigation { //nevagcion para capitulo siguiente y anterior.
  chapters: { id: string; number: number }[];
  previousId: string | null;
  nextId: string | null;
}

// datos del capítulo para decidir el acceso (todavía sin las páginas)
export async function getChapterForReader(chapterId: string): Promise<ReaderChapter | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chapters")
    .select(
      "id, chapter_number, title, work_id, is_vln, is_premium, original_language, page_count, page_sizes, works(title, cover_url)",
    )
    .eq("id", chapterId)
    .maybeSingle();

  if (error) console.error(error);
  if (error || !data) return null;

  const work = firstOf(data.works);
  return {
    id: data.id,
    number: Number(data.chapter_number),
    title: data.title,
    workId: data.work_id,
    workTitle: work?.title ?? "Obra",
    coverUrl: work?.cover_url ?? null,
    isVln: data.is_vln,
    isPremium: data.is_premium,
    originalLanguage: data.original_language,
    pageCount: data.page_count,
    pageSizes: Array.isArray(data.page_sizes) ? (data.page_sizes as PageSize[]) : null,
  };
}

// deja solo las URLs , si value es una lista se queda con los textos, si no queda vacía
function toUrlList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((url): url is string => typeof url === "string") : [];
}

// trae las paginas del capítulo (solo se llama si el usuario puede leerlo) y con lang buscamos la traduccion (language)
export async function getChapterPages(chapter: ReaderChapter, lang: string | null): Promise<ChapterPages> {
  const supabase = await createClient();

  // la RLS solo deja ver traducciones publicadas y las propias del autor y traductor
  if (lang && lang !== chapter.originalLanguage) {
    const { data: translation } = await supabase
      .from("chapter_translations")
      .select("id, content")
      .eq("chapter_id", chapter.id)
      .eq("language", lang)
      .maybeSingle();

    const urls = toUrlList(translation?.content); //guardamos los url del contenido
    if (translation && urls.length > 0) return { urls, language: lang, translationId: translation.id };
  }

  // si no hay traduccion o no existe, devuelve el capitulo en el lenguaje original
  const { data } = await supabase.from("chapters").select("content").eq("id", chapter.id).maybeSingle();
  return { urls: toUrlList(data?.content), language: chapter.originalLanguage, translationId: null };
}

// revisa que una traducción sea de ese capítulo y que el usuario pueda verla
export async function isTranslationOfChapter(translationId: string, chapterId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("chapter_translations")
    .select("id")
    .eq("id", translationId)
    .eq("chapter_id", chapterId)
    .maybeSingle();

  return Boolean(data);
}

// capítulos publicados de la obra, con el anterior y el siguiente al actual
export async function getChapterNavigation(
  workId: string,
  chapterId: string,
  chapterNumber: number,
): Promise<ChapterNavigation> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("chapters")
    .select("id, chapter_number")
    .eq("work_id", workId)
    .eq("publication_status", "published")
    .order("chapter_number", { ascending: true });

  const chapters = (data ?? []).map((row) => ({ id: row.id, number: Number(row.chapter_number) }));
  if (!chapters.some((chapter) => chapter.id === chapterId)) {  //verifica si el capitulo está en la lista
    chapters.push({ id: chapterId, number: chapterNumber }); //si no lo está lo agrega a la lista
    chapters.sort((a, b) => a.number - b.number); //y ordenamos la lista de menor a mayor
  }

  const previous = chapters.filter((chapter) => chapter.number < chapterNumber).at(-1); //buscamos el num de cap menor al que se lee, y elejimos el ultimo elemento (capitulo anterior)
  const next = chapters.find((chapter) => chapter.number > chapterNumber);

  return { chapters, previousId: previous?.id ?? null, nextId: next?.id ?? null };
}

// de una lista de capítulos, cuáles tradujo el usuario (el mismo o su grupo)
export async function getTranslatedChapterIds(userId: string, chapterIds: string[]): Promise<Set<string>> {
  if (chapterIds.length === 0) return new Set();

  const supabase = await createClient();
  const group = await getMyGroup(userId);

  // el trabajo lo agarró el usuario, o su grupo si tiene uno, esto es para la consulta.
  const takenBy = group ? `translator_id.eq.${userId},group_id.eq.${group.id}` : `translator_id.eq.${userId}`;

  const { data, error } = await supabase
    .from("translation_jobs")
    .select("chapter_id")
    .in("chapter_id", chapterIds)
    .or(takenBy);

  if (error) {
    console.error(error);
    return new Set();
  }

  return new Set(data.map((row) => row.chapter_id));
}

// de una lista de capítulos, cuáles ya leyó el usuario (para el check en la UI)
export async function getMyReadChapterIds(userId: string, chapterIds: string[]): Promise<Set<string>> {
  if (chapterIds.length === 0) return new Set();

  const supabase = await createClient();

  const { data } = await supabase
    .from("reading_progress")
    .select("chapter_id")
    .eq("user_id", userId)
    .eq("read", true)
    .in("chapter_id", chapterIds);

  return new Set((data ?? []).map((row) => row.chapter_id));
}
