"use server";

import { createClient } from "@/lib/supabase/server";

// marca como leídas todas las notificaciones visibles del usuario logueado
export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false)
    .lte("created_at", new Date().toISOString());
}
