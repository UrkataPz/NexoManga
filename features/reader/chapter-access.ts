import { isWorkAuthor } from "@/lib/works_queries";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getTranslatedChapterIds } from "@/lib/reader_queries";
import { getCurrentPlan } from "@/lib/subscriptions_queries";
import { getUnlockedChapterIds, getVlnRemainingToday } from "@/lib/vln_queries";

export type ChapterAccess =
  | { allowed: true; reason: "own_work" | "free" | "premium" | "vln_unlocked" }
  | { allowed: false; reason: "premium_required" }
  | { allowed: false; reason: "vln_gate"; remaining: number };

interface ChapterAccessInput {
  userId: string;
  chapterId: string;
  workId: string;
  isVln: boolean;
  isPremium: boolean;
}

// decide si el usuario puede leer el capítulo y por qué, la primer regla en cumplirse es la que se elije
export async function getChapterAccess(input: ChapterAccessInput): Promise<ChapterAccess> {
  const { userId, chapterId, workId, isVln, isPremium } = input;

  // el admin revisa todo gratis y sin generar valor (igual que leer lo propio)
  const profile = await getCurrentUserProfile(userId);
  if (profile?.roles.includes("admin")) return { allowed: true, reason: "own_work" };

  if (await isWorkAuthor(userId, workId)) return { allowed: true, reason: "own_work" }; //puede leer, obra propia
  // quien tradujo este capítulo (él o su grupo) lo lee gratis en todos sus idiomas y sin generar valor
  const translated = await getTranslatedChapterIds(userId, [chapterId]);
  if (translated.has(chapterId)) return { allowed: true, reason: "own_work" };  

  if (!isVln && !isPremium) return { allowed: true, reason: "free" }; //si noe s vln o premium es gratis el capitlo

  const plan = await getCurrentPlan();
  if (plan !== "free") return { allowed: true, reason: "premium" }; //si es premium todo es libre

  if (isPremium) return { allowed: false, reason: "premium_required" }; //si el capitulo es premium no deja entrar

  const unlocked = await getUnlockedChapterIds(userId, [chapterId]);
  if (unlocked.has(chapterId)) return { allowed: true, reason: "vln_unlocked" }; //pregunta si se desbloqueo con VLN anteriormente

  return { allowed: false, reason: "vln_gate", remaining: await getVlnRemainingToday(userId) };
}
