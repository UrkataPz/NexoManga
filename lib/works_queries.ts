import { createClient } from "./supabase/server";
import { firstOf } from "./utils";

export interface Work {
    id: string;
    title: string;
    coverUrl: string|null;
    authorName: string;
    languages: string[];
}

//obtenemos obras por mas reciente
export async function getLatestWorks(): Promise<Work[]> {
    const supabase = await createClient();

    //el resultado devuelve un objeto con data y error, se revisan ambos.
    const {data, error} = await supabase
    .from("works")
    .select("id, title, cover_url, work_authors(user_profiles(username))")
    .eq("moderation_status", "approved")
    .order("created_at", {ascending: false})
    .limit(10);

    
    if(error){
        console.error(error);
        return[];
    }

    const workIds = data.map((work) => work.id);
    const languagesByWork = await getLanguagesByWork(workIds);

    return data.map((work) => {
    // una obra tiene un solo autor (Supabase lo manda como objeto)
    const mainAuthor = firstOf(work.work_authors);

    return {
      id: work.id,
      title: work.title,
      coverUrl: work.cover_url,
      authorName: firstOf(mainAuthor?.user_profiles)?.username ?? "Autor desconocido",
      languages: languagesByWork.get(work.id) ?? [],
    };
  });
}


// TODO: esto es un criterio temporal (orden alfabético). Cuando exista el conteo real
// de lecturas (tabla reading_events), cambiar el orden a "más leídas".
export async function getPopularWorks():Promise<Work[]>{
    const supabase = await createClient();

    //el resultado devuelve un objeto con data y error, se revisan ambos.
    const {data, error} = await supabase
    .from("works")
    .select("id, title, cover_url, work_authors(user_profiles(username))")
    .eq("moderation_status", "approved")
    .order("title", { ascending: true })
    .limit(10);

    if(error){
        console.error(error);
        return[];
    }

     const workIds = data.map((work) => work.id);
    const languagesByWork = await getLanguagesByWork(workIds);

    return data.map((work) => {
    // una obra tiene un solo autor (Supabase lo manda como objeto)
    const mainAuthor = firstOf(work.work_authors);

    return {
      id: work.id,
      title: work.title,
      coverUrl: work.cover_url,
      authorName: firstOf(mainAuthor?.user_profiles)?.username ?? "Autor desconocido",
      languages: languagesByWork.get(work.id) ?? [],
    };
  });
}

//obtenemos los idiomas disponibles por cada obra
async function getLanguagesByWork(workIds: string[]): Promise<Map<string, string[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chapters")
    .select("work_id, original_language, chapter_translations(language)")
    .in("work_id", workIds)
    .eq("publication_status", "published");

  if (error) {
    console.error(error);
    return new Map();
  }

  const languagesByWork = new Map<string, Set<string>>();

  for (const chapter of data) {
    const languages = languagesByWork.get(chapter.work_id) ?? new Set<string>();
    languages.add(chapter.original_language);

    for (const translation of chapter.chapter_translations) {
      languages.add(translation.language);
    }

    languagesByWork.set(chapter.work_id, languages);
  }

  const result = new Map<string, string[]>();
  for (const [workId, languages] of languagesByWork) {
    result.set(workId, Array.from(languages));
  }

  return result;
}

//Obtener datos de todos los detalles de la obra
export interface WorkDetail {
  id: string;
  title: string;
  alternativeTitles: string[];
  synopsis: string | null;
  type: string;
  status: string;
  coverUrl: string | null;
  genres: string[];
  authorName: string;
  languages: string[];
}

export async function getWorkDetail(workId: string): Promise<WorkDetail | null> {
  const supabase = await createClient();

  const { data: work, error } = await supabase
    .from("works")
    .select(
    "id, title, alternative_titles, synopsis, type, status, cover_url, work_genres(genres(name)), work_authors(user_profiles(username))",
    )
    .eq("id", workId)
    .single();

  if (error || !work) {
    console.error(error);
    return null;
  }

  // una obra tiene un solo autor (Supabase lo manda como objeto)
  const mainAuthor = firstOf(work.work_authors);

  const { data: chapters } = await supabase
    .from("chapters")
    .select("original_language, chapter_translations(language)")
    .eq("work_id", workId)
    .eq("publication_status", "published");

  const languages = new Set<string>();
  for (const chapter of chapters ?? []) {
    languages.add(chapter.original_language);
    for (const translation of chapter.chapter_translations) {
      languages.add(translation.language);
    }
  }

  return {
    id: work.id,
    title: work.title,
    alternativeTitles: work.alternative_titles ?? [],
    synopsis: work.synopsis,
    type: work.type,
    status: work.status,
    coverUrl: work.cover_url,
    genres: work.work_genres.map((row) => firstOf(row.genres)?.name ?? "Género"),
    authorName: firstOf(mainAuthor?.user_profiles)?.username ?? "Autor desconocido",
    languages: Array.from(languages),
  };
}

// Comentarios de nivel-obra (chapter_id vacío) — los de un capítulo puntual se muestran
// en el lector, no aquí.
export interface WorkComment {
  id: string;
  content: string;
  createdAt: string;
  username: string;
  avatarUrl: string | null;
}

export async function getWorkComments(workId: string, limit = 50): Promise<WorkComment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at, user_profiles(username, profile_image_url)")
    .eq("work_id", workId)
    .is("chapter_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((row) => {
    const profile = firstOf(row.user_profiles);
    return {
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      username: profile?.username ?? "Usuario",
      avatarUrl: profile?.profile_image_url ?? null,
    };
  });
}

// capítulos publicados de una obra, con los idiomas en que se pueden leer
export interface Chapter {
  id: string;
  number: number;
  title: string | null;
  publicationDate: string | null;
  isVln: boolean;
  isPremium: boolean;
  // el original primero y después las traducciones publicadas
  languages: string[];
}

export async function getWorkChapters(workId: string): Promise<Chapter[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chapters")
    .select(
      "id, chapter_number, title, publication_date, is_vln, is_premium, original_language, chapter_translations(language)",
    )
    .eq("work_id", workId)
    .eq("publication_status", "published")
    .order("chapter_number", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((chapter) => ({
    id: chapter.id,
    number: chapter.chapter_number,
    title: chapter.title,
    publicationDate: chapter.publication_date,
    isVln: chapter.is_vln,
    isPremium: chapter.is_premium,
    languages: [
      chapter.original_language,
      ...chapter.chapter_translations.map((translation) => translation.language),
    ],
  }));
}

// revisa si el usuario es autor de la obra
export async function isWorkAuthor(userId: string, workId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("work_authors")
    .select("user_id")
    .eq("work_id", workId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

// lista de géneros para el filtro
export interface Genre {
  id: string;
  name: string;
}

export async function getGenres(): Promise<Genre[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("genres").select("id, name").order("name");

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}

// idiomas originales usados en algún capítulo publicado, para el filtro
export async function getAvailableLanguages(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chapters")
    .select("original_language")
    .eq("publication_status", "published");

  if (error) {
    console.error(error);
    return [];
  }

  return Array.from(new Set(data.map((row) => row.original_language)));
}

//---------------
// filtro simple
//---------------
export interface WorkSearchFilters {
  query?: string;
  type?: string;
  status?: string;
  genreId?: string;
  language?: string;
  sort?: string;
  onlyIds?: string[];
}

// busca obras en TODO el catálogo público aplicando los filtros que vengan
export async function searchWorks(filters: WorkSearchFilters): Promise<Work[]> {
  const supabase = await createClient();

  let query = supabase
    .from("works")
    .select("id, title, cover_url, work_authors(user_profiles(username))")
    .eq("moderation_status", "approved");

  if (filters.onlyIds) query = query.in("id", filters.onlyIds);
  if (filters.query) query = query.ilike("title", `%${filters.query}%`);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.status) query = query.eq("status", filters.status);

  if (filters.genreId) {
    const { data: genreRows } = await supabase
      .from("work_genres")
      .select("work_id")
      .eq("genre_id", filters.genreId);
    query = query.in("id", (genreRows ?? []).map((row) => row.work_id));
  }

  if (filters.language) {
    const { data: chapterRows } = await supabase
      .from("chapters")
      .select("work_id")
      .eq("original_language", filters.language)
      .eq("publication_status", "published");
    query = query.in(
      "id",
      Array.from(new Set((chapterRows ?? []).map((row) => row.work_id))),
    );
  }

  query =
    filters.sort === "title"
      ? query.order("title", { ascending: true })
      : query.order("created_at", { ascending: false });

  const { data, error } = await query.limit(60);

  if (error) {
    console.error(error);
    return [];
  }

  const workIds = data.map((work) => work.id);
  const languagesByWork = await getLanguagesByWork(workIds);

  return data.map((work) => {
    // una obra tiene un solo autor (Supabase lo manda como objeto)
    const mainAuthor = firstOf(work.work_authors);

    return {
      id: work.id,
      title: work.title,
      coverUrl: work.cover_url,
      authorName: firstOf(mainAuthor?.user_profiles)?.username ?? "Autor desconocido",
      languages: languagesByWork.get(work.id) ?? [],
    };
  });
}
//---------------

// obras publicadas por un autor específico, para su perfil
export async function getWorksByAuthor(userId: string): Promise<Work[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("work_authors")
    .select("work_id")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) return [];

  return searchWorks({ onlyIds: data.map((row) => row.work_id) });
}