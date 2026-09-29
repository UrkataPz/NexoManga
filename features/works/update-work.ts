"use server";

import { createClient } from "@/lib/supabase/server";
import { convertToWebp, uploadWebp } from "@/lib/images";
import { isWorkAuthor } from "@/lib/works_queries";
import { setWorkCover, updateWorkRow } from "@/lib/panel_queries";
import {
  WORK_COVER_HEIGHT,
  WORK_COVER_MAX_MB,
  WORK_COVER_WIDTH,
  WORK_STATUSES,
  WORK_TYPES,
  type WorkStatus,
  type WorkType,
} from "@/features/works/work-options";

type UpdateWorkResult = { error?: string };

// recibe el formulario de modificar obra y guarda los cambios; la portada solo cambia si eligieron una
export async function updateWork(workId: string, formData: FormData): Promise<UpdateWorkResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return { error: "No autenticado." };
  if (!(await isWorkAuthor(userId, workId))) return { error: "No eres autor de esta obra." };

  const title = String(formData.get("title") ?? "").trim();
  const alternativeTitles = String(formData.get("alternativeTitles") ?? "")
    .split(",")
    .map((alternativeTitle) => alternativeTitle.trim())
    .filter(Boolean);
  const type = String(formData.get("type") ?? "");
  const status = String(formData.get("status") ?? "");
  const synopsis = String(formData.get("synopsis") ?? "").trim();
  const genreIds = formData.getAll("genreIds").map(String);
  const cover = formData.get("cover");

  if (!title) return { error: "El título es obligatorio." };
  if (title.length > 150) return { error: "El título no puede pasar de 150 caracteres." };
  if (!WORK_TYPES.includes(type as WorkType)) return { error: "Selecciona un tipo de obra válido." };
  if (!WORK_STATUSES.includes(status as WorkStatus)) return { error: "Selecciona un estado válido." };

  const updateError = await updateWorkRow(workId, {
    title,
    alternativeTitles,
    type: type as WorkType,
    status: status as WorkStatus,
    synopsis: synopsis || null,
    genreIds,
  });
  if (updateError) return { error: updateError };

  if (cover instanceof File && cover.size > 0) {
    const converted = await convertToWebp(cover, {
      maxSizeMB: WORK_COVER_MAX_MB,
      width: WORK_COVER_WIDTH,
      height: WORK_COVER_HEIGHT,
    });
    if (converted.buffer === undefined) return { error: converted.error };

    const uploaded = await uploadWebp("work-covers", `${workId}/cover.webp`, converted.buffer);
    if (uploaded.url === undefined) return { error: "No se pudo subir la portada. Intenta de nuevo." };

    const coverError = await setWorkCover(workId, uploaded.url);
    if (coverError) return { error: coverError };
  }

  return {};
}
