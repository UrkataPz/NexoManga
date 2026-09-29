"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { convertToWebp, uploadWebp } from "@/lib/images";
import { sendNewChapterEmails } from "@/lib/email";
import { isWorkAuthor } from "@/lib/works_queries";
import { saveChapterPageSize, trimChapterPageSizes } from "@/lib/reading_queries";
import {
  getChapterPageUrls,
  getChapterPublication,
  insertChapterDraft,
  isChapterAuthor,
  saveChapterContent,
  updateChapterRow,
} from "@/lib/panel_queries";
import {
  CHAPTER_ACCESS,
  CHAPTER_MAX_PAGES,
  CHAPTER_PAGE_MAX_MB,
  LANGUAGES,
  PUBLISH_MODES,
  type ChapterAccess,
  type PublishMode,
} from "@/features/chapters/chapter-options";

type CreateDraftResult = { chapterId: string; error?: undefined } | { error: string; chapterId?: undefined };
type ActionResult = { error?: string };

// devuelve el id del usuario logueado, o null si no hay sesión
async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  return authData?.claims?.sub ?? null;
}

// revisa que un número sea entero y esté entre 1 y el máximo de páginas
function isValidPageNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= CHAPTER_MAX_PAGES;
}

// paso 1: valida los datos del capítulo y lo crea como borrador
export async function createChapterDraft(formData: FormData): Promise<CreateDraftResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };

  const workId = String(formData.get("workId") ?? "");
  const chapterNumber = Number(formData.get("chapterNumber"));
  const title = String(formData.get("title") ?? "").trim();
  const language = String(formData.get("language") ?? "");
  const access = String(formData.get("access") ?? "");
  const contentType = String(formData.get("contentType") ?? "");
  const pageCount = Number(formData.get("pageCount"));

  if (!workId) return { error: "Selecciona una obra." };
  if (!Number.isFinite(chapterNumber) || chapterNumber <= 0 || chapterNumber > 99999) {
    return { error: "El número de capítulo debe ser mayor que 0." };
  }
  if (title.length > 150) return { error: "El título no puede pasar de 150 caracteres." };
  if (!Object.hasOwn(LANGUAGES, language)) return { error: "Selecciona un idioma válido." };
  if (!CHAPTER_ACCESS.includes(access as ChapterAccess)) return { error: "Selecciona un tipo de acceso." };
  if (contentType !== "images" && contentType !== "pdf") return { error: "Tipo de contenido inválido." };
  if (!isValidPageNumber(pageCount)) {
    return { error: `El capítulo debe tener entre 1 y ${CHAPTER_MAX_PAGES} páginas.` };
  }

  if (!(await isWorkAuthor(userId, workId))) return { error: "No eres autor de esta obra." };

  return insertChapterDraft({
    workId,
    chapterNumber,
    title: title || null,
    language,
    access: access as ChapterAccess,
    contentType,
    pageCount,
  });
}

// modificar capítulo: guarda número, título, idioma, acceso y tipo de contenido
export async function updateChapterDetails(chapterId: string, formData: FormData): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };
  if (!(await isChapterAuthor(userId, chapterId))) return { error: "No eres autor de este capítulo." };

  const chapterNumber = Number(formData.get("chapterNumber"));
  const title = String(formData.get("title") ?? "").trim();
  const language = String(formData.get("language") ?? "");
  const access = String(formData.get("access") ?? "");
  const contentType = formData.get("contentType") === "pdf" ? "pdf" : "images";

  if (!Number.isFinite(chapterNumber) || chapterNumber <= 0) {
    return { error: "El número de capítulo debe ser mayor que 0." };
  }
  if (!Object.hasOwn(LANGUAGES, language)) return { error: "Selecciona un idioma válido." };
  if (!CHAPTER_ACCESS.includes(access as ChapterAccess)) return { error: "Selecciona un tipo de acceso." };

  const error = await updateChapterRow(chapterId, {
    chapterNumber,
    title: title || null,
    language,
    access: access as ChapterAccess,
    contentType,
  });
  return error ? { error } : {};
}

// paso 2: revisa, convierte a WebP y sube UNA página del capítulo
export async function uploadChapterPage(formData: FormData): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };

  const chapterId = String(formData.get("chapterId") ?? "");
  const pageNumber = Number(formData.get("pageNumber"));
  const page = formData.get("page");

  if (!isValidPageNumber(pageNumber)) return { error: "Número de página inválido." };
  if (!(page instanceof File)) return { error: "Archivo inválido." };
  if (!(await isChapterAuthor(userId, chapterId))) return { error: "No eres autor de este capítulo." };

  const converted = await convertToWebp(page, { maxSizeMB: CHAPTER_PAGE_MAX_MB });
  if (converted.buffer === undefined) return { error: converted.error };

  const uploaded = await uploadWebp("chapter-pages", `${chapterId}/pg-${pageNumber}.webp`, converted.buffer);
  if (uploaded.url === undefined) return { error: uploaded.error };

  await saveChapterPageSize(chapterId, pageNumber, [converted.width, converted.height]);

  return {};
}

// paso 3: comprueba que estén todas las páginas y publica, programa o deja en borrador
export async function publishChapter(
  chapterId: string,
  pageCount: number,
  mode: PublishMode,
  scheduledAt: string | null,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };

  if (!PUBLISH_MODES.includes(mode)) return { error: "Modo de publicación inválido." };
  if (!isValidPageNumber(pageCount)) return { error: "Cantidad de páginas inválida." };
  if (!(await isChapterAuthor(userId, chapterId))) return { error: "No eres autor de este capítulo." };

  const pageUrls = await getChapterPageUrls(chapterId, pageCount);
  if (!pageUrls) return { error: "Faltan páginas por subir. Intenta de nuevo." };

  const previous = await getChapterPublication(chapterId);
  await trimChapterPageSizes(chapterId, pageCount);

  if (mode === "draft") {
    const error = await saveChapterContent(chapterId, pageUrls, "draft", null);
    return error ? { error } : {};
  }

  // si ya estaba publicado (al modificarlo), conserva su fecha original
  let publicationDate =
    previous?.state === "published" && previous.publicationDate
      ? new Date(previous.publicationDate)
      : new Date();

  if (mode === "schedule") {
    publicationDate = new Date(scheduledAt ?? "");
    if (Number.isNaN(publicationDate.getTime())) return { error: "La fecha programada no es válida." };
    if (publicationDate.getTime() <= Date.now()) {
      return { error: "La fecha programada debe ser en el futuro." };
    }
  }

  const error = await saveChapterContent(chapterId, pageUrls, "published", publicationDate.toISOString());
  if (error) return { error };

  // los correos salen solo la primera vez que el capítulo deja de ser borrador (después de responder)
  if (previous?.state === "draft") {
    after(() => sendNewChapterEmails(chapterId));
  }
  return {};
}
