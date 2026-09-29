import { createClient } from "@/lib/supabase/server";
import { LIBRARY_TAGS, type LibraryTag } from "@/features/library/library-tags";
import { searchWorks, type Work, type WorkSearchFilters } from "@/lib/works_queries";

//obtiene los marcadores del user para la obra
export async function getMyLibraryTag(userId: string, workId: string): Promise<LibraryTag | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_library")
    .select("following, to_read, read, favorite, dislike")
    .eq("user_id", userId)
    .eq("work_id", workId)
    .maybeSingle();

  if (!data) return null;

  return LIBRARY_TAGS.find((tag) => data[tag]) ?? null;
}

//---------------
// filtro simple
//---------------
// trae las obras guardadas del usuario, agrupadas por tag, con los filtros aplicados
export async function getLibraryWorks(
  userId: string,
  filters: WorkSearchFilters,
): Promise<Record<LibraryTag, Work[]>> {
  const supabase = await createClient();

  const buckets: Record<LibraryTag, Work[]> = {
    following: [],
    to_read: [],
    read: [],
    favorite: [],
    dislike: [],
  };

  const { data: libraryRows, error } = await supabase
    .from("user_library")
    .select("work_id, following, to_read, read, favorite, dislike")
    .eq("user_id", userId);

  if (error || !libraryRows || libraryRows.length === 0) return buckets;

  const tagByWork = new Map<string, LibraryTag>();
  for (const row of libraryRows) {
    const tag = LIBRARY_TAGS.find((t) => row[t]);
    if (tag) tagByWork.set(row.work_id, tag);
  }

  const works = await searchWorks({ ...filters, onlyIds: Array.from(tagByWork.keys()) });

  for (const work of works) {
    const tag = tagByWork.get(work.id);
    if (tag) buckets[tag].push(work);
  }

  return buckets;
}
//---------------