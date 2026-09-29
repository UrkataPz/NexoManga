"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string };

// guarda un reporte de una obra o de un usuario 
async function saveReport(
  target: { reported_work_id: string } | { reported_user_id: string },
  reason: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return { error: "Inicia sesión para reportar." };
  if (!reason.trim()) return { error: "Escribe el motivo del reporte." };

  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: userId, ...target, reason: reason.trim() });

  return { error: error?.message };
}

// reporta una obra
export async function reportWork(workId: string, reason: string): Promise<ActionResult> {
  return saveReport({ reported_work_id: workId }, reason);
}

// reporta a un usuario
export async function reportUser(userId: string, reason: string): Promise<ActionResult> {
  return saveReport({ reported_user_id: userId }, reason);
}
