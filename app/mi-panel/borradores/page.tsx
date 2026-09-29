import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getMyChapters } from "@/lib/panel_queries";
import { MyChaptersList } from "@/components/MyChapters/my-chapters-list";

// borradores: capítulos sin publicar (incluidos los de subidas cortadas) para terminarlos
export default async function BorradoresPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const profile = await getCurrentUserProfile(userId);
  if (!profile?.roles.includes("author")) {
    redirect("/mi-panel");
  }

  const drafts = await getMyChapters(userId, true);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Borradores</h1>
        <p className="text-muted-foreground">Capítulos que todavía no publicaste.</p>
      </div>
      <MyChaptersList chapters={drafts} actionLabel="Terminar" emptyText="No tienes borradores." />
    </div>
  );
}
