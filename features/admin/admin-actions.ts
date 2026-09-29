"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminId, logAdminAction } from "@/features/admin/admin-tools";

type ActionResult = { error?: string };

const NOT_ADMIN = "Solo el administrador puede hacer esto.";

// aprueba una obra en revisión 
export async function approveWork(workId: string): Promise<ActionResult> {
  const adminId = await getAdminId();
  if (!adminId) return { error: NOT_ADMIN };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .update({
      moderation_status: "approved",
      moderation_note: null,
      moderated_by: adminId,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", workId)
    .select("title")
    .single();

  if (error) return { error: error.message };

  await logAdminAction(adminId, "Aprobó una obra", "obra", workId, data.title);
  return {};
}

// rechaza una obra con el motivo (el autor lo ve en su aviso)
export async function rejectWork(workId: string, reason: string): Promise<ActionResult> {
  const adminId = await getAdminId();
  if (!adminId) return { error: NOT_ADMIN };
  if (!reason.trim()) return { error: "Escribe el motivo del rechazo." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .update({
      moderation_status: "rejected",
      moderation_note: reason.trim(),
      moderated_by: adminId,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", workId)
    .select("title")
    .single();

  if (error) return { error: error.message };

  await logAdminAction(adminId, "Rechazó una obra", "obra", workId, `${data.title}: ${reason.trim()}`);
  return {};
}

// marca un reporte como revisado (se tomó acción) o descartado (no había nada malo)
export async function resolveReport(reportId: string, status: "reviewed" | "dismissed"): Promise<ActionResult> {
  const adminId = await getAdminId();
  if (!adminId) return { error: NOT_ADMIN };

  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) return { error: error.message };

  const action = status === "reviewed" ? "Revisó un reporte" : "Descartó un reporte";
  await logAdminAction(adminId, action, "reporte", reportId, null);
  return {};
}

// publica un anuncio oficial (se ve en /anuncios)
export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const adminId = await getAdminId();
  if (!adminId) return { error: NOT_ADMIN };

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) return { error: "Escribe el título y el texto del anuncio." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_announcements")
    .insert({ admin_id: adminId, title, content })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAdminAction(adminId, "Publicó un anuncio", "anuncio", data.id, title);
  return {};
}

// borra un anuncio
export async function deleteAnnouncement(announcementId: string): Promise<ActionResult> {
  const adminId = await getAdminId();
  if (!adminId) return { error: NOT_ADMIN };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_announcements")
    .delete()
    .eq("id", announcementId)
    .select("title")
    .single();

  if (error) return { error: error.message };

  await logAdminAction(adminId, "Borró un anuncio", "anuncio", announcementId, data.title);
  return {};
}
