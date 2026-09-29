import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getMyRequestedJobs, getMyTranslatableChapters } from "@/lib/translations_queries";
import { JOB_STATUS_LABELS } from "@/features/translations/translation-options";
import { RequestTranslationForm } from "@/components/Translations/request-translation-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Traducciones (autor): pedir la traducción de un capítulo y ver mis solicitudes
export default async function TraduccionesPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [profile, chapters, jobs] = await Promise.all([
    getCurrentUserProfile(userId),
    getMyTranslatableChapters(userId),
    getMyRequestedJobs(userId),
  ]);
  if (!profile?.roles.includes("author")) {
    redirect("/mi-panel");
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Traducciones</h1>
        <p className="text-muted-foreground">Pide la traducción de un capítulo publicado: aparece en el tablero de Comunidad.</p>
      </div>

      <RequestTranslationForm chapters={chapters} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Mis solicitudes</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no pediste traducciones.</p>
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
                    {job.pendingApplications > 0 && ` · ${job.pendingApplications} postulantes`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={job.status === "submitted" ? "default" : "secondary"}>
                    {JOB_STATUS_LABELS[job.status]}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/mi-panel/traducciones/${job.id}`}>Ver</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
