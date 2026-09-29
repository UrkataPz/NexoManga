"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { convertToWebp, uploadWebp } from "@/lib/images";
import { POST_IMAGE_MAX_MB, POST_MAX_LENGTH } from "@/features/community/community-options";

type ActionResult = { error?: string };
type FollowResult = { following: boolean; error?: undefined } | { error: string; following?: undefined };

// publica un post (o una respuesta si trae parentPostId), con una imagen opcional
export async function createPost(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return { error: "Inicia sesión para publicar." };

  const content = String(formData.get("content") ?? "").trim();
  const parentPostId = String(formData.get("parentPostId") ?? "") || null;
  const image = formData.get("image");

  if (!content) return { error: "Escribe algo para publicar." };
  if (content.length > POST_MAX_LENGTH) {
    return { error: `El texto no puede pasar de ${POST_MAX_LENGTH} caracteres.` };
  }

  let images: string[] | null = null;
  if (image instanceof File && image.size > 0) {
    const converted = await convertToWebp(image, { maxSizeMB: POST_IMAGE_MAX_MB });
    if (converted.buffer === undefined) return { error: converted.error };

    const uploaded = await uploadWebp("post-images", `${userId}/${randomUUID()}.webp`, converted.buffer);
    if (uploaded.url === undefined) return { error: uploaded.error };
    images = [uploaded.url];
  }

  // una respuesta nunca es anuncio; además, el trigger de la BD solo deja anunciar a autores y traductores
  const isAnnouncement = parentPostId === null && formData.get("announcement") === "on";

  const { error } = await supabase.from("posts").insert({
    user_id: userId,
    content,
    images,
    parent_post_id: parentPostId,
    post_type: isAnnouncement ? "announcement" : "discussion",
  });

  return error ? { error: error.message } : {};
}

// borra un post propio (sus respuestas se borran solas en la BD)
export async function deletePost(postId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return { error: "No autenticado." };

  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId);
  return error ? { error: error.message } : {};
}

// seguir o dejar de seguir a un autor (si ya lo sigue, lo deja de seguir)
export async function toggleFollow(authorId: string): Promise<FollowResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return { error: "Inicia sesión para seguir autores." };
  if (userId === authorId) return { error: "No puedes seguirte a ti mismo." };

  const { data: existing } = await supabase
    .from("user_follows")
    .select("author_id")
    .eq("follower_id", userId)
    .eq("author_id", authorId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", userId)
      .eq("author_id", authorId);
    return error ? { error: error.message } : { following: false };
  }

  const { error } = await supabase.from("user_follows").insert({ follower_id: userId, author_id: authorId });
  return error ? { error: error.message } : { following: true };
}
