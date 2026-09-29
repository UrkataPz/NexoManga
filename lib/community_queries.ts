import { createClient } from "@/lib/supabase/server";
import { firstOf } from "@/lib/utils";
import { searchWorks, type Work } from "@/lib/works_queries";

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorRoles: string[];
  content: string;
  imageUrl: string | null;
  isAnnouncement: boolean;
  dateLabel: string;
  replies: CommunityPost[];
}

interface PostProfile {
  username: string;
  profile_image_url: string | null;
  roles: string[] | null;
}

interface PostRow {
  id: string;
  user_id: string;
  parent_post_id: string | null;
  content: string | null;
  images: unknown;
  post_type: string;
  created_at: string;
  user_profiles: PostProfile | PostProfile[] | null;
}

const POST_SELECT =
  "id, user_id, parent_post_id, content, images, post_type, created_at, user_profiles(username, profile_image_url, roles)";

// convierte una fila de "posts" al formato que usa la pantalla
function toCommunityPost(row: PostRow): CommunityPost {
  const profile = firstOf(row.user_profiles);
  const images = Array.isArray(row.images) ? row.images : [];

  return {
    id: row.id,
    authorId: row.user_id,
    authorName: profile?.username ?? "Usuario",
    authorAvatarUrl: profile?.profile_image_url ?? null,
    authorRoles: profile?.roles ?? [],
    content: row.content ?? "",
    imageUrl: typeof images[0] === "string" ? images[0] : null,
    isAnnouncement: row.post_type === "announcement",
    dateLabel: new Date(row.created_at).toLocaleDateString("es", { day: "numeric", month: "short" }),
    replies: [],
  };
}

// feed público: los 50 posts más nuevos, cada uno con sus respuestas (un solo nivel)
export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("parent_post_id", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    return [];
  }

  const posts = (data as unknown as PostRow[]).map(toCommunityPost);
  if (posts.length === 0) return posts;

  const { data: replyRows } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .in("parent_post_id", posts.map((post) => post.id))
    .order("created_at", { ascending: true });

  for (const row of (replyRows ?? []) as unknown as PostRow[]) {
    posts.find((post) => post.id === row.parent_post_id)?.replies.push(toCommunityPost(row));
  }

  return posts;
}

export interface CommunityMember {
  id: string;
  username: string;
  avatarUrl: string | null;
  roles: string[];
}

// Descubre: autores y traductores, filtrados por nombre si escribieron algo
export async function getCommunityMembers(search: string): Promise<CommunityMember[]> {
  const supabase = await createClient();

  let query = supabase
    .from("user_profiles")
    .select("id, username, profile_image_url, roles")
    .overlaps("roles", ["author", "translator"])
    .order("username")
    .limit(60);

  if (search) query = query.ilike("username", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    username: row.username,
    avatarUrl: row.profile_image_url,
    roles: row.roles ?? [],
  }));
}

export interface PublicProfile {
  id: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  roles: string[];
}

// perfil público de cualquier usuario (sale de la vista user_profiles)
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, username, bio, profile_image_url, banner_url, roles")
    .eq("id", userId)
    .maybeSingle();

  if (error) console.error(error);
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    bio: data.bio,
    avatarUrl: data.profile_image_url,
    bannerUrl: data.banner_url,
    roles: data.roles ?? [],
  };
}

// cuántos seguidores tiene un autor (función get_follower_count de la BD)
export async function getFollowerCount(authorId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_follower_count", { p_author_id: authorId });
  return Number(data ?? 0);
}

// revisa si un usuario ya sigue a un autor
export async function isFollowing(followerId: string, authorId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_follows")
    .select("author_id")
    .eq("follower_id", followerId)
    .eq("author_id", authorId)
    .maybeSingle();

  return Boolean(data);
}

// obras que un traductor tradujo (trabajos de traducción ya publicados)
export async function getTranslatedWorks(translatorId: string): Promise<Work[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("translation_jobs")
    .select("chapters(work_id)")
    .eq("translator_id", translatorId)
    .eq("status", "published");

  const workIds = new Set<string>();
  for (const row of data ?? []) {
    const workId = firstOf(row.chapters)?.work_id;
    if (workId) workIds.add(workId);
  }

  if (workIds.size === 0) return [];
  return searchWorks({ onlyIds: Array.from(workIds) });
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  dateLabel: string;
}

// anuncios oficiales que publica el admin (página /anuncios)
export async function getPlatformAnnouncements(): Promise<PlatformAnnouncement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("platform_announcements")
    .select("id, title, content, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    dateLabel: new Date(row.created_at).toLocaleDateString("es", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  }));
}
