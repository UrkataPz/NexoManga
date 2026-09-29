export const WORK_TYPES = [
  "manga",
  "manhwa",
  "comic",
  "webtoon",
  "one_shot",
  "light_novel",
] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  manga: "Manga",
  manhwa: "Manhwa",
  comic: "Cómic",
  webtoon: "Webtoon",
  one_shot: "One shot",
  light_novel: "Novela ligera",
};

export const WORK_STATUSES = ["ongoing", "finished", "on_hiatus", "cancelled"] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  ongoing: "En emisión",
  finished: "Finalizada",
  on_hiatus: "En pausa",
  cancelled: "Cancelada",
};

// estado de moderación de una obra, como lo ve el autor
export const WORK_MODERATION_LABELS: Record<string, string> = {
  pending: "En revisión",
  approved: "Publicada",
  rejected: "Rechazada",
};

// medidas y peso máximo de la portada de una obra
export const WORK_COVER_WIDTH = 480;
export const WORK_COVER_HEIGHT = 720;
export const WORK_COVER_MAX_MB = 3;
