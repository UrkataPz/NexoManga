import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getCurrentPlan } from "@/lib/subscriptions_queries";
import { canAccessPanel } from "@/features/panel/panel-options";
import { PanelSidebar } from "@/components/PanelSidebar/panel-sidebar";

// marco de Mi panel: solo entran autores y traductores; menú a la izquierda, contenido a la derecha
export default async function MiPanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const claims = authData?.claims;

  if (!claims) {
    redirect("/auth/login");
  }

  const [profile, plan] = await Promise.all([
    getCurrentUserProfile(claims.sub),
    getCurrentPlan(),
  ]);

  if (!profile || !canAccessPanel(profile.roles)) {
    redirect("/");
  }

  // etiqueta bajo el nombre: el admin no tiene plan
  let planLabel = plan === "free" ? "Plan gratis" : "Premium";
  if (profile.roles.includes("admin")) planLabel = "Administrador";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <PanelSidebar
        roles={profile.roles}
        username={profile.username}
        email={claims.email ?? ""}
        avatarUrl={profile.profileImageUrl}
        planLabel={planLabel}
      />
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
