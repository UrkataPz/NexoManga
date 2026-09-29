import { createClient } from "@/lib/supabase/server";

// VLN = "Vidas de Lectura Nexomanga" (antes llamado WUF). Reglas, simplificadas a propósito
// respecto al diseño original: 3 desbloqueos gratis por día calendario, sin límite adicional
// después (a diferencia del proyecto viejo, que dejaba seguir desbloqueando con una espera de
// 3h una vez agotados los 3 — eso lo quitamos, si se acaban hay que esperar a mañana). Cada
// desbloqueo da acceso a ESE capítulo puntual por 72 horas.
export const VLN_DAILY_FREE_UNLOCKS = 3;
export const VLN_UNLOCK_VALID_HOURS = 72;

// Cuántos desbloqueos le quedan hoy al usuario (compartidos entre todas las obras, no por obra).
export async function getVlnRemainingToday(userId: string): Promise<number> {
  const supabase = await createClient();

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("vln_unlocks")
    .select("id")
    .eq("user_id", userId)
    .gte("unlocked_at", startOfToday.toISOString());

  if (error) {
    console.error(error);
    return 0;
  }

  return Math.max(0, VLN_DAILY_FREE_UNLOCKS - data.length);
}

// De una lista de capítulos, cuáles ya tiene el usuario desbloqueados AHORA MISMO (dentro de
// las últimas 72 horas) — para no volver a pedirle que gaste un desbloqueo en el mismo capítulo.
export async function getUnlockedChapterIds(
  userId: string,
  chapterIds: string[],
): Promise<Set<string>> {
  const supabase = await createClient();

  const validSince = new Date(Date.now() - VLN_UNLOCK_VALID_HOURS * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("vln_unlocks")
    .select("chapter_id")
    .eq("user_id", userId)
    .in("chapter_id", chapterIds)
    .gte("unlocked_at", validSince.toISOString());

  if (error) {
    console.error(error);
    return new Set();
  }

  return new Set(data.map((row) => row.chapter_id));
}
