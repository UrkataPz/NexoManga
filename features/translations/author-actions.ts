"use server";

import { createClient } from "@/lib/supabase/server";
import { isChapterAuthor } from "@/lib/panel_queries";
import { isJobAuthor } from "@/lib/translations_queries";
import { LANGUAGES } from "@/features/chapters/chapter-options";
import { MATERIAL_TYPES, type MaterialType } from "@/features/translations/translation-options";

type ActionResult = { error?: string };

// devuelve el id del usuario logueado, o null si no hay sesión
async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  return authData?.claims?.sub ?? null;
}

// pide la traducción de un capítulo publicado: queda "abierto" en el tablero
export async function requestTranslation(formData: FormData): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };

  const chapterId = String(formData.get("chapterId") ?? "");
  const targetLanguage = String(formData.get("targetLanguage") ?? "");
  const materialType = String(formData.get("materialType") ?? "");

  if (!chapterId) return { error: "Elige un capítulo." };
  if (!Object.hasOwn(LANGUAGES, targetLanguage)) return { error: "Elige el idioma de la traducción." };
  if (!MATERIAL_TYPES.includes(materialType as MaterialType)) return { error: "Elige el tipo de material." };
  if (!(await isChapterAuthor(userId, chapterId))) return { error: "No eres autor de este capítulo." };

  const supabase = await createClient();
  const { data: chapter } = await supabase
    .from("chapters")
    .select("original_language, publication_status")
    .eq("id", chapterId)
    .maybeSingle();

  if (chapter?.publication_status !== "published") return { error: "Solo se traducen capítulos publicados." };
  if (chapter.original_language === targetLanguage) {
    return { error: "El idioma de la traducción debe ser distinto al original." };
  }

  const { error } = await supabase.from("translation_jobs").insert({
    chapter_id: chapterId,
    target_language: targetLanguage,
    material_type: materialType,
  });

  if (error?.code === "23505") return { error: "Ya pediste la traducción de este capítulo a ese idioma." };
  return error ? { error: error.message } : {};
}

// elige a un postulante: la función de la BD asigna el trabajo, rechaza a los demás y avisa a todos
export async function acceptApplication(jobId: string, applicationId: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("aceptar_postulacion", {
    p_job_id: jobId,
    p_application_id: applicationId,
  });

  return error ? { error: error.message } : {};
}

// aprueba la traducción enviada: queda publicada para los lectores (la BD avisa al traductor)
export async function approveTranslation(jobId: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };
  if (!(await isJobAuthor(userId, jobId))) return { error: "No eres autor de esta obra." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("translation_jobs")
    .update({ status: "published" })
    .eq("id", jobId)
    .eq("status", "submitted");

  return error ? { error: error.message } : {};
}

// devuelve la traducción al traductor con una nota de lo que debe corregir (la BD le avisa)
export async function requestRevision(jobId: string, note: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };
  if (!note.trim()) return { error: "Escribe qué hay que corregir." };
  if (!(await isJobAuthor(userId, jobId))) return { error: "No eres autor de esta obra." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("translation_jobs")
    .update({ status: "needs_revision", rejection_note: note.trim() })
    .eq("id", jobId)
    .eq("status", "submitted");

  return error ? { error: error.message } : {};
}
