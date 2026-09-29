import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getMyWorks } from "@/lib/panel_queries";
import { WORK_MODERATION_LABELS } from "@/features/works/work-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// modificar obra: lista de mis obras para elegir cuál modificar
export default async function ModificarObraPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [profile, works] = await Promise.all([getCurrentUserProfile(userId), getMyWorks(userId)]);
  if (!profile?.roles.includes("author")) {
    redirect("/mi-panel");
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Modificar obra</h1>
        <p className="text-muted-foreground">Elige la obra que quieres modificar.</p>
      </div>

      {works.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no tienes obras.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {works.map((work) => (
            <li key={work.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">{work.title}</span>
                <Badge variant={work.moderationStatus === "rejected" ? "destructive" : "secondary"}>
                  {WORK_MODERATION_LABELS[work.moderationStatus] ?? work.moderationStatus}
                </Badge>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/mi-panel/publicar/modificar-obra/${work.id}`}>Modificar</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
