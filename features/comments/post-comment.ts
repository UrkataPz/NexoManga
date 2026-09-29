"use server";

import { createClient } from "@/lib/supabase/server";

interface PostedComment {
  id: string;
  content: string;
  createdAt: string;
  username: string;
  avatarUrl: string | null;
}

type PostCommentResult = {
  comment?: PostedComment;
  error?: string;
};

// Comentario de nivel-obra (chapter_id vacío) — cualquier usuario logueado puede crear el suyo.
export async function postComment(workId: string, content: string): Promise<PostCommentResult> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "El comentario no puede estar vacío." };
  if (trimmed.length > 2000) return { error: "El comentario es demasiado largo." };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return { error: "No autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("username, profile_image_url")
    .eq("id", userId)
    .single();

  const { data, error } = await supabase
    .from("comments")
    .insert({ work_id: workId, user_id: userId, content: trimmed })
    .select("id, content, created_at")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se pudo publicar el comentario." };
  }

  return {
    comment: {
      id: data.id,
      content: data.content,
      createdAt: data.created_at,
      username: profile?.username ?? "Usuario",
      avatarUrl: profile?.profile_image_url ?? null,
    },
  };
}
