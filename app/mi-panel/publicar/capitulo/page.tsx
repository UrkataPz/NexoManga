import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getMyWorks } from "@/lib/panel_queries";
import { ChapterForm } from "@/components/ChapterForm/chapter-form";

// página de publicar capítulo dentro de Mi panel (solo autores)
export default async function PublicarCapituloPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [profile, works] = await Promise.all([getCurrentUserProfile(userId), getMyWorks(userId)]);

  if (!profile?.roles.includes("author")) {
    redirect("/publicar");
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Publicar capítulo</h1>
        <p className="text-muted-foreground">Sube las páginas y elige cuándo publicarlo.</p>
      </div>

      {works.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no tienes obras.{" "}
          <Link href="/mi-panel/publicar/obra" className="underline">
            Publica tu primera obra
          </Link>{" "}
          para poder subir capítulos.
        </p>
      ) : (
        <ChapterForm works={works} />
      )}
    </div>
  );
}
