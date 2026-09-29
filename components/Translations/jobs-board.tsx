"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applyToJob } from "@/features/translations/translator-actions";
import { MATERIAL_TYPE_HELP, MATERIAL_TYPE_LABELS } from "@/features/translations/translation-options";
import type { JobSummary } from "@/lib/translations_queries";

interface JobsBoardProps {
  jobs: JobSummary[];
  appliedJobIds: string[];
  isLoggedIn: boolean;
}

// tablero de trabajos de traducción abiertos, con el botón para postularse
export function JobsBoard({ jobs, appliedJobIds, isLoggedIn }: JobsBoardProps) {
  const router = useRouter();
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  // se postula y recarga para que el trabajo aparezca como "Postulado"
  const handleApply = async (jobId: string) => {
    setPendingJobId(jobId);
    const result = await applyToJob(jobId);
    setPendingJobId(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("¡Te postulaste! El autor te avisará si te elige.");
    router.refresh();
  };

  if (jobs.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No hay trabajos abiertos por ahora.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {jobs.map((job) => (
        <li key={job.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {job.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={job.coverUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate font-semibold">
              {job.workTitle} — Cap. {job.chapterNumber}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">
                {job.originalLanguage.toUpperCase()} → {job.targetLanguage.toUpperCase()}
              </Badge>
              <Badge variant="secondary">{MATERIAL_TYPE_LABELS[job.materialType]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{MATERIAL_TYPE_HELP[job.materialType]}</p>
          </div>

          <div className="shrink-0 self-center">
            {!isLoggedIn ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/auth/login">Postularme</Link>
              </Button>
            ) : appliedJobIds.includes(job.id) ? (
              <Badge className="bg-brand text-white hover:bg-brand">Postulado ✓</Badge>
            ) : (
              <Button size="sm" onClick={() => handleApply(job.id)} disabled={pendingJobId !== null}>
                {pendingJobId === job.id ? "Enviando..." : "Postularme"}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
