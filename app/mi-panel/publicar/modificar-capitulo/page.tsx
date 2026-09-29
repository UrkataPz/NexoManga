import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getMyChapters } from "@/lib/panel_queries";
import { MyChaptersList } from "@/components/MyChapters/my-chapters-list";

// modificar capítulo: lista de mis capítulos para elegir cuál modificar
export default async function ModificarCapituloPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [profile, chapters] = await Promise.all([getCurrentUserProfile(userId), getMyChapters(userId)]);
  if (!profile?.roles.includes("author")) {
    redirect("/mi-panel");
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Modificar capítulo</h1>
        <p className="text-muted-foreground">Elige el capítulo que quieres modificar.</p>
      </div>
      <MyChaptersList chapters={chapters} actionLabel="Modificar" emptyText="Todavía no tienes capítulos." />
    </div>
  );
}
