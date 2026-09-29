// tipos de material que el autor le da al traductor
export const MATERIAL_TYPES = ["empty_bubbles", "embedded_dialogue"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_TYPE_LABELS: Record<string, string> = {
  empty_bubbles: "Globos vacíos",
  embedded_dialogue: "Globos con texto",
};

// qué tiene que hacer el traductor según el material (siempre entrega la página completa)
export const MATERIAL_TYPE_HELP: Record<string, string> = {
  empty_bubbles: "Los globos vienen en blanco: escribe el texto traducido y sube las páginas completas.",
  embedded_dialogue: "El texto original está dibujado: bórralo, escribe la traducción y sube las páginas completas.",
};

// estado de un trabajo de traducción
export const JOB_STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  assigned: "Asignado",
  in_progress: "En progreso",
  submitted: "Enviado, en revisión",
  needs_revision: "Necesita correcciones",
  approved: "Aprobado",
  published: "Publicado",
};

// estado de una postulación
export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "No elegida",
};

// estados en los que el traductor puede subir (o volver a subir) las páginas
export const UPLOADABLE_STATUSES = ["assigned", "in_progress", "needs_revision"];

// límites de los grupos
export const GROUP_NAME_MAX = 50;
export const GROUP_DESCRIPTION_MAX = 300;
export const GROUP_MIN_MEMBERS = 2;
export const GROUP_MAX_MEMBERS = 10;
