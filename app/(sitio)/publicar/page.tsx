import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getGenres } from "@/lib/works_queries";
import { WorkForm } from "@/components/WorkForm/work-form";

// publicar la primera obra (quien todavía no es autor); al publicar, el trigger lo vuelve autor
export default async function PublicarPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [profile, genres] = await Promise.all([getCurrentUserProfile(userId), getGenres()]);

  // el admin no publica y el autor publica desde su panel
  if (profile?.roles.includes("admin")) redirect("/");
  if (profile?.roles.includes("author")) redirect("/mi-panel/publicar/obra");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">Publica tu primera obra</h1>
        <p className="text-muted-foreground">
          Un administrador la revisa antes de que aparezca en el sitio. Te avisamos en la campanita.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <WorkForm genres={genres} />
      </div>
    </div>
  );
}
