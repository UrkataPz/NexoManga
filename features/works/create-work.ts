"use server";

import { createClient } from "@/lib/supabase/server";
import { convertToWebp, uploadWebp } from "@/lib/images";
import { deleteWork, insertWork, setWorkCover } from "@/lib/panel_queries";
import {
  WORK_COVER_HEIGHT,
  WORK_COVER_MAX_MB,
  WORK_COVER_WIDTH,
  WORK_STATUSES,
  WORK_TYPES,
  type WorkStatus,
  type WorkType,
} from "@/features/works/work-options";

type CreateWorkResult = { workId: string; error?: undefined } | { error: string; workId?: undefined };

// recibe el formulario de publicar obra, lo valida y crea la obra con su portada
export async function createWork(formData: FormData): Promise<CreateWorkResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return { error: "No autenticado." };

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
  if (synopsis.length > 2000) return { error: "La sinopsis no puede pasar de 2000 caracteres." };
  if (!(cover instanceof File) || cover.size === 0) return { error: "La portada es obligatoria." };

  const converted = await convertToWebp(cover, {
    maxSizeMB: WORK_COVER_MAX_MB,
    width: WORK_COVER_WIDTH,
    height: WORK_COVER_HEIGHT,
  });
  if (converted.buffer === undefined) return { error: converted.error };

  const created = await insertWork(userId, {
    title,
    alternativeTitles,
    type: type as WorkType,
    status: status as WorkStatus,
    synopsis: synopsis || null,
    genreIds,
  });
  if (created.workId === undefined) return { error: created.error };

  const uploaded = await uploadWebp("work-covers", `${created.workId}/cover.webp`, converted.buffer);
  if (uploaded.url === undefined) {
    await deleteWork(created.workId);
    return { error: "No se pudo subir la portada. Intenta de nuevo." };
  }

  const coverError = await setWorkCover(created.workId, uploaded.url);
  if (coverError) return { error: coverError };

  return { workId: created.workId };
}
