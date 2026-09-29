import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJobForAuthor } from "@/lib/translations_queries";
import { JOB_STATUS_LABELS, MATERIAL_TYPE_LABELS } from "@/features/translations/translation-options";
import { ApplicantsList } from "@/components/Translations/applicants-list";
import { ReviewActions } from "@/components/Translations/review-actions";
import { PagesPreview } from "@/components/Translations/pages-preview";
import { Badge } from "@/components/ui/badge";

interface TraduccionPageProps {
  params: Promise<{ id: string }>;
}

// un trabajo de traducción visto por su autor: postulantes, estado y revisión
export default async function TraduccionPage({ params }: TraduccionPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const job = await getJobForAuthor(userId, id);
  if (!job) {
    notFound();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/mi-panel/traducciones"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Mis solicitudes
        </Link>
        <h1 className="text-2xl font-bold">
          {job.workTitle} — Cap. {job.chapterNumber}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">
            {job.originalLanguage.toUpperCase()} → {job.targetLanguage.toUpperCase()}
          </Badge>
          <Badge variant="secondary">{MATERIAL_TYPE_LABELS[job.materialType]}</Badge>
          <Badge>{JOB_STATUS_LABELS[job.status]}</Badge>
        </div>
        {job.translatorName && (
          <p className="text-sm text-muted-foreground">
            Traduce: <strong>{job.translatorName}</strong>
            {job.groupName && ` (grupo ${job.groupName})`}
          </p>
        )}
      </div>

      {job.status === "open" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Postulantes</h2>
          <ApplicantsList jobId={job.id} applications={job.applications} canAccept />
        </section>
      )}

      {job.status === "assigned" && (
        <p className="rounded-md border border-border bg-card px-3 py-2 text-sm">Esperando que el traductor suba las páginas.</p>
      )}

      {job.status === "needs_revision" && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          Pediste correcciones: {job.rejectionNote}
        </p>
      )}

      {job.translatedPages.length > 0 && <PagesPreview title="Páginas traducidas" urls={job.translatedPages} />}

      {job.status === "submitted" && <ReviewActions jobId={job.id} />}
    </div>
  );
}
