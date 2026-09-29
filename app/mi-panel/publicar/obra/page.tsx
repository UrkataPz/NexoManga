import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getGenres } from "@/lib/works_queries";
import { WorkForm } from "@/components/WorkForm/work-form";

// página de publicar obra dentro de Mi panel (solo autores)
export default async function PublicarObraPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [profile, genres] = await Promise.all([getCurrentUserProfile(userId), getGenres()]);

  if (!profile?.roles.includes("author")) {
    redirect("/publicar");
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Publicar obra</h1>
        <p className="text-muted-foreground">Completa los datos de tu nueva obra.</p>
      </div>
      <WorkForm genres={genres} />
    </div>
  );
}
