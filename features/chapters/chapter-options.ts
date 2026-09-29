// idiomas disponibles: código de 2 letras → nombre en español
export const LANGUAGES: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  ja: "Japonés",
  ko: "Coreano",
  zh: "Chino",
  pt: "Portugués",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  id: "Indonesio",
  th: "Tailandés",
  vi: "Vietnamita",
  ar: "Árabe",
  ru: "Ruso",
};

// devuelve el nombre de un idioma a partir de su código
export function getLanguageLabel(code: string): string {
  return LANGUAGES[code] ?? code;
}

export const CHAPTER_ACCESS = ["free", "vln", "premium"] as const;
export type ChapterAccess = (typeof CHAPTER_ACCESS)[number];

export const CHAPTER_ACCESS_LABELS: Record<ChapterAccess, string> = {
  free: "Libre",
  vln: "VLN (desbloqueo diario)",
  premium: "Premium",
};

export const PUBLISH_MODES = ["now", "schedule", "draft"] as const;
export type PublishMode = (typeof PUBLISH_MODES)[number];

export const PUBLISH_MODE_LABELS: Record<PublishMode, string> = {
  now: "Publicar ahora",
  schedule: "Programar",
  draft: "Guardar como borrador",
};

// estado de un capítulo como lo ve el autor
export type ChapterState = "draft" | "scheduled" | "published";

export const CHAPTER_STATE_LABELS: Record<ChapterState, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  published: "Publicado",
};

// borrador, programado (publicado con fecha futura) o publicado
export function getChapterState(status: string, publicationDate: string | null): ChapterState {
  if (status !== "published") return "draft";
  if (publicationDate && new Date(publicationDate) > new Date()) return "scheduled";
  return "published";
}

// límites para subir capítulos
export const CHAPTER_PAGE_MAX_MB = 4;
export const CHAPTER_MAX_PAGES = 200;
export const CHAPTER_PDF_MAX_MB = 100;
