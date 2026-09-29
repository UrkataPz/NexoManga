import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { firstOf } from "@/lib/utils";

const EMAIL_FROM = process.env.RESEND_FROM_EMAIL ?? "NexoManga <onboarding@resend.dev>";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const MAX_SCHEDULE_DAYS = 30;
const PAUSE_BETWEEN_EMAILS_MS = 600;

interface Recipient {
  email: string;
  username: string;
}

// escapa los caracteres especiales para meter texto de usuarios en un correo HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// espera unos milisegundos porque plan gratuito de resend tiene limite de cuantos recibe por segundo
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// manda el correo de "capítulo nuevo" a quienes recibieron su notificación
export async function sendNewChapterEmails(chapterId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const supabase = createAdminClient();

  const { data: chapter } = await supabase
    .from("chapters")
    .select("chapter_number, title, work_id, publication_date, works(title, moderation_status)")
    .eq("id", chapterId)
    .maybeSingle();

  const work = firstOf(chapter?.works);
  if (!chapter || !work || work.moderation_status !== "approved") return;

  const publishAt = chapter.publication_date ? new Date(chapter.publication_date) : new Date();
  const isScheduled = publishAt.getTime() > Date.now();
  if (publishAt.getTime() > Date.now() + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000) return;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("users(email, username, email_notifications_enabled)")
    .eq("chapter_id", chapterId)
    .eq("type", "new_chapter");

  const recipients: Recipient[] = [];
  for (const row of notifications ?? []) {
    const user = firstOf(row.users);
    if (user?.email && user.email_notifications_enabled) {
      recipients.push({ email: user.email, username: user.username });
    }
  }

  const resend = new Resend(apiKey);
  const chapterName = chapter.title
    ? `Capítulo ${chapter.chapter_number}: ${escapeHtml(chapter.title)}`
    : `Capítulo ${chapter.chapter_number}`;
  const link = `${SITE_URL}/obra/${chapter.work_id}`;

  for (const recipient of recipients) {
    try {
      const { error } = await resend.emails.send({  //await para que espere a que se envie el correo antes de pasar al siguiente user
        from: EMAIL_FROM,
        to: recipient.email,
        subject: `Nuevo capítulo de ${work.title}`,
        html: `<p>Hola ${escapeHtml(recipient.username)},</p>
<p>Ya salió el <strong>${chapterName}</strong> de <strong>${escapeHtml(work.title)}</strong>.</p>
<p><a href="${link}">Leer en NexoManga</a></p>
<p style="color:#888;font-size:12px">Puedes desactivar estos correos desde tu perfil.</p>`,
        scheduledAt: isScheduled ? publishAt.toISOString() : undefined,
      });
      if (error) console.error("[email] no se pudo enviar a", recipient.username, error.message);
    } catch (sendError) {
      console.error("[email] error de conexión con Resend", sendError);
    }
    await wait(PAUSE_BETWEEN_EMAILS_MS);
  }
}
