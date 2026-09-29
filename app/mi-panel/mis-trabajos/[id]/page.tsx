import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJobForTranslator } from "@/lib/translations_queries";
import {
  JOB_STATUS_LABELS,
  MATERIAL_TYPE_HELP,
  MATERIAL_TYPE_LABELS,
  UPLOADABLE_STATUSES,
} from "@/features/translations/translation-options";
import { PagesPreview } from "@/components/Translations/pages-preview";
import { DownloadPagesButton } from "@/components/Translations/download-pages-button";
import { TranslationUploadForm } from "@/components/Translations/translation-upload-form";
import { Badge } from "@/components/ui/badge";

interface MiTrabajoPageProps {
  params: Promise<{ id: string }>;
}

// un trabajo visto por su traductor: páginas originales, correcciones y el subidor
export default async function MiTrabajoPage({ params }: MiTrabajoPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const job = await getJobForTranslator(userId, id);
  if (!job) {
    notFound();
  }

  const canUpload = UPLOADABLE_STATUSES.includes(job.status);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/mi-panel/mis-trabajos"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Mis trabajos
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
        <p className="text-sm text-muted-foreground">{MATERIAL_TYPE_HELP[job.materialType]}</p>
      </div>

      {job.status === "needs_revision" && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          El autor pidió correcciones: {job.rejectionNote}
        </p>
      )}

      <PagesPreview title="Páginas originales" urls={job.originalPages} />
      {job.originalPages.length > 0 && (
        <DownloadPagesButton urls={job.originalPages} fileName={`${job.workTitle} - Cap ${job.chapterNumber}`} />
      )}

      {job.translatedPages.length > 0 && <PagesPreview title="Lo que enviaste" urls={job.translatedPages} />}

      {canUpload ? (
        <TranslationUploadForm jobId={job.id} originalPageCount={job.originalPageCount} />
      ) : (
        <p className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          {job.status === "submitted"
            ? "Enviado: el autor lo está revisando."
            : "¡Traducción publicada! Ya la pueden leer."}
        </p>
      )}
    </div>
  );
}
