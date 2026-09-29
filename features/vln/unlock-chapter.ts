"use server";

import { createClient } from "@/lib/supabase/server";
import { getVlnRemainingToday } from "@/lib/vln_queries";

type UnlockChapterResult = { error?: string };

// Gasta uno de los desbloqueos gratis del día para dar acceso a ESTE capítulo por 72 horas.
export async function unlockChapter(chapterId: string): Promise<UnlockChapterResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return { error: "No autenticado." };

  const remaining = await getVlnRemainingToday(userId);
  if (remaining <= 0) {
    return { error: "Ya usaste tus 3 desbloqueos gratis de hoy. Vuelve mañana." };
  }

  const { error } = await supabase
    .from("vln_unlocks")
    .insert({ user_id: userId, chapter_id: chapterId });

  return { error: error?.message };
}
