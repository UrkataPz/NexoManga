import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyApplications, getMyTranslatorJobs } from "@/lib/translations_queries";
import { APPLICATION_STATUS_LABELS, JOB_STATUS_LABELS } from "@/features/translations/translation-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Mis trabajos (traductor): trabajos asignados para subir y mis postulaciones
export default async function MisTrabajosPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [jobs, applications] = await Promise.all([getMyTranslatorJobs(userId), getMyApplications(userId)]);
  const pendingApplications = applications.filter((application) => application.status === "pending");

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Mis trabajos</h1>
        <p className="text-muted-foreground">Traducciones que te asignaron y tus postulaciones pendientes.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Asignados a mí</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no te asignaron trabajos. Postúlate en{" "}
            <Link href="/comunidad/traducir" className="underline">
              Comunidad › Traducir
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {jobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {job.workTitle} — Cap. {job.chapterNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {job.originalLanguage.toUpperCase()} → {job.targetLanguage.toUpperCase()}
                    {job.groupName && ` · grupo ${job.groupName}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={job.status === "needs_revision" ? "destructive" : "secondary"}>
                    {JOB_STATUS_LABELS[job.status]}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/mi-panel/mis-trabajos/${job.id}`}>Abrir</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Postulaciones pendientes</h2>
        {pendingApplications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tienes postulaciones esperando respuesta.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {pendingApplications.map((application) => (
              <li key={application.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-sm">
                  {application.job
                    ? `${application.job.workTitle} — Cap. ${application.job.chapterNumber} (${application.job.targetLanguage.toUpperCase()})`
                    : "Trabajo de traducción"}
                </span>
                <Badge variant="secondary">{APPLICATION_STATUS_LABELS[application.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
