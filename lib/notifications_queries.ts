import { createClient } from "@/lib/supabase/server";
import { firstOf } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  message: string;
  href: string;
  read: boolean;
  dateLabel: string;
}

interface JobEmbed {
  id: string;
  target_language: string;
  chapters: { chapter_number: number; works: { title: string } | { title: string }[] | null } | null;
}

// describe un trabajo de traducción para el aviso
function describeJob(job: JobEmbed | undefined): string {
  const chapter = firstOf(job?.chapters);
  if (!job || !chapter) return "un capítulo";
  const workTitle = firstOf(chapter.works)?.title ?? "una obra";
  return `el cap. ${chapter.chapter_number} de ${workTitle} (${job.target_language.toUpperCase()})`;
}

// trae las últimas notificaciones visibles del usuario, con su texto y enlace ya armados
export async function getMyNotifications(userId: string, limit = 30): Promise<NotificationItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, read, created_at, job_id, chapters(chapter_number, work_id, works(title)), works(id, title, moderation_note), translation_jobs(id, target_language, chapters(chapter_number, works(title)))",
    )
    .eq("user_id", userId)
    .lte("created_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(error);
    return [];
  }

  const items: NotificationItem[] = [];

  for (const row of data) {
    const chapter = firstOf(row.chapters);
    const work = firstOf(row.works);
    // si al traductor no lo eligieron, queda un texto general
    const job = firstOf(row.translation_jobs as unknown as JobEmbed | JobEmbed[] | null); // saca el trabajo del aviso
    const dateLabel = new Date(row.created_at).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
    });
    const base = { id: row.id, read: row.read, dateLabel }; //la base del aviso

    if (row.type === "new_chapter" && chapter) {
      const workTitle = firstOf(chapter.works)?.title ?? "una obra que sigues";
      items.push({
        ...base,
        message: `Nuevo capítulo ${chapter.chapter_number} de ${workTitle}`,
        href: `/obra/${chapter.work_id}`,
      });
    } else if (row.type === "new_work" && work) {
      items.push({ ...base, message: `Nueva obra de un autor que sigues: ${work.title}`, href: `/obra/${work.id}` });
    } else if (row.type === "work_approved" && work) {
      items.push({ ...base, message: `Tu obra "${work.title}" fue aprobada y ya es pública.`, href: `/obra/${work.id}` });
    } else if (row.type === "work_rejected" && work) {
      items.push({
        ...base,
        message: `Tu obra "${work.title}" fue rechazada: ${work.moderation_note ?? "sin motivo indicado"}`,
        href: `/mi-panel/publicar/modificar-obra/${work.id}`,
      });
    } else if (row.type === "author_announcement") {
      items.push({ ...base, message: "Un autor que sigues publicó un anuncio.", href: "/comunidad" });
    } else if (row.type === "new_application") {
      items.push({
        ...base,
        message: `Alguien se postuló para traducir ${describeJob(job)}.`,
        href: `/mi-panel/traducciones/${row.job_id}`,
      });
    } else if (row.type === "application_accepted") {
      items.push({
        ...base,
        message: `¡Te eligieron para traducir ${describeJob(job)}!`,
        href: `/mi-panel/mis-trabajos/${row.job_id}`,
      });
    } else if (row.type === "application_rejected") {
      items.push({ ...base, message: "Tu postulación para traducir no fue elegida esta vez.", href: "/comunidad/traducir" });
    } else if (row.type === "translation_needs_revision") {
      items.push({
        ...base,
        message: `Te pidieron correcciones en la traducción de ${describeJob(job)}.`,
        href: `/mi-panel/mis-trabajos/${row.job_id}`,
      });
    } else if (row.type === "translation_approved") {
      items.push({
        ...base,
        message: `¡Se publicó tu traducción de ${describeJob(job)}!`,
        href: `/mi-panel/mis-trabajos/${row.job_id}`,
      });
    } else if (row.type === "translation_submitted") {
      items.push({
        ...base,
        message: `Llegó la traducción de ${describeJob(job)} para que la revises.`,
        href: `/mi-panel/traducciones/${row.job_id}`,
      });
    } else if (row.type === "group_invite") {
      items.push({ ...base, message: "Te invitaron a un grupo de traducción.", href: "/comunidad/traducir" });
    }
  }

  return items;
}
