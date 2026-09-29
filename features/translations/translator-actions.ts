"use server";

import { createClient } from "@/lib/supabase/server";
import { firstOf } from "@/lib/utils";
import { convertToWebp, uploadWebp } from "@/lib/images";
import { getChapterPageUrls, isChapterAuthor } from "@/lib/panel_queries";
import { getMyGroup } from "@/lib/translations_queries";
import { CHAPTER_PAGE_MAX_MB } from "@/features/chapters/chapter-options";
import { UPLOADABLE_STATUSES } from "@/features/translations/translation-options";

type ActionResult = { error?: string };

// devuelve el id del usuario logueado, o null si no hay sesión
async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  return authData?.claims?.sub ?? null;
}

interface UploadableJob {
  chapterId: string;
  targetLanguage: string;
  originalPageCount: number;
}

// trae un trabajo solo si el usuario es su traductor y todavía puede subir páginas
async function getUploadableJob(userId: string, jobId: string): Promise<UploadableJob | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("translation_jobs")
    .select("status, chapter_id, target_language, chapters(page_count)")
    .eq("id", jobId)
    .eq("translator_id", userId)
    .maybeSingle();

  if (!data || !UPLOADABLE_STATUSES.includes(data.status)) return null;
  return {
    chapterId: data.chapter_id,
    targetLanguage: data.target_language,
    originalPageCount: Number(firstOf(data.chapters)?.page_count ?? 0),
  };
}

// se postula a un trabajo abierto (a nombre de su grupo si tiene uno, como exige la BD)
export async function applyToJob(jobId: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "Inicia sesión para postularte." };

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("translation_jobs")
    .select("status, chapter_id")
    .eq("id", jobId)
    .maybeSingle();

  if (job?.status !== "open") return { error: "Este trabajo ya no está abierto." };
  if (await isChapterAuthor(userId, job.chapter_id)) return { error: "No puedes traducir tu propia obra." };

  const group = await getMyGroup(userId);
  const { error } = await supabase
    .from("translation_applications")
    .insert({ job_id: jobId, translator_id: userId, group_id: group?.id ?? null });

  if (error?.code === "23505") {
    return { error: error.message.includes("job_group") ? "Tu grupo ya se postuló a este trabajo." : "Ya te postulaste." };
  }
  return error ? { error: error.message } : {};
}

// sube UNA página traducida (misma conversión a WebP que las páginas de capítulo)
export async function uploadTranslationPage(formData: FormData): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };

  const jobId = String(formData.get("jobId") ?? "");
  const pageNumber = Number(formData.get("pageNumber"));
  const page = formData.get("page");

  const job = await getUploadableJob(userId, jobId);
  if (!job) return { error: "No puedes subir páginas a este trabajo." };

  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > job.originalPageCount) {
    return { error: "Número de página inválido." };
  }
  if (!(page instanceof File)) return { error: "Archivo inválido." };

  const converted = await convertToWebp(page, { maxSizeMB: CHAPTER_PAGE_MAX_MB });
  if (converted.buffer === undefined) return { error: converted.error };

  const uploaded = await uploadWebp("chapter-translation-pages", `${jobId}/pg-${pageNumber}.webp`, converted.buffer);
  return uploaded.url === undefined ? { error: uploaded.error } : {};
}

// entrega la traducción: guarda la lista de páginas y el trabajo pasa a "enviado" (la BD avisa al autor)
export async function submitTranslation(jobId: string, pageCount: number): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };

  const job = await getUploadableJob(userId, jobId);
  if (!job) return { error: "No puedes enviar este trabajo." };

  if (pageCount !== job.originalPageCount) {
    return { error: `La traducción debe tener las mismas ${job.originalPageCount} páginas que el original.` };
  }

  const pageUrls = await getChapterPageUrls(jobId, pageCount, "chapter-translation-pages");
  if (!pageUrls) return { error: "Faltan páginas por subir. Intenta de nuevo." };

  const supabase = await createClient();
  const { error: saveError } = await supabase.from("chapter_translations").upsert(
    {
      translation_job_id: jobId,
      chapter_id: job.chapterId,
      language: job.targetLanguage,
      content: pageUrls,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "translation_job_id" },
  );
  if (saveError) return { error: saveError.message };

  const { error } = await supabase
    .from("translation_jobs")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", jobId);

  return error ? { error: error.message } : {};
}
