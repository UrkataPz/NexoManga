import Link from "next/link";
import { Crown, LayoutDashboard, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getCurrentPlan } from "@/lib/subscriptions_queries";
import { getVlnRemainingToday, VLN_DAILY_FREE_UNLOCKS } from "@/lib/vln_queries";
import { getMyNotifications } from "@/lib/notifications_queries";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutMenuItem } from "@/components/NavBar/logout-menu-item";
import { NotificationBell } from "@/components/Notifications/notification-bell";
import { canAccessPanel } from "@/features/panel/panel-options";

export async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const authUser = data?.claims;

  if (!authUser) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline" className="bg-transparent hover:border-brand hover:bg-brand hover:text-white">
          <Link href="/auth/login">Iniciar sesión</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/auth/sign-up">Registrarse</Link>
        </Button>
      </div>
    );
  }
//notificaciones
  const [profile, plan, notifications] = await Promise.all([
    getCurrentUserProfile(authUser.sub),
    getCurrentPlan(),
    getMyNotifications(authUser.sub),
  ]);

  const displayName = profile?.username ?? authUser.email ?? "Usuario";
  const roles = profile?.roles ?? [];
  // el admin es solo admin: no publica, no usa VLN ni suscripción
  const isAdmin = roles.includes("admin");
  const vlnRemaining = plan === "free" && !isAdmin ? await getVlnRemainingToday(authUser.sub) : null;
  const publishHref = roles.includes("author") ? "/mi-panel/publicar/obra" : "/publicar";

  return (
    <>
      {!isAdmin && (
        <Button asChild size="sm">
          <Link href={publishHref}>Publicar</Link>
        </Button>
      )}
      <NotificationBell items={notifications} showPanelLink={canAccessPanel(roles)} />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Menú de usuario"
          className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-brand data-[state=open]:bg-brand sm:pl-3"
        >
          <span className="hidden max-w-[10rem] truncate text-sm font-semibold uppercase tracking-wide sm:block">
            {displayName}
          </span>
          <Avatar imageUrl={profile?.profileImageUrl ?? null} name={displayName} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="flex flex-col px-2 py-1.5">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">{authUser.email}</span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/perfil">
              <User size={16} />
              Perfil
            </Link>
          </DropdownMenuItem>
          {vlnRemaining !== null && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Lecturas gratis hoy: {vlnRemaining}/{VLN_DAILY_FREE_UNLOCKS}
            </div>
          )}
          {canAccessPanel(roles) && (
            <DropdownMenuItem asChild>
              <Link href="/mi-panel">
                <LayoutDashboard size={16} />
                Mi panel
              </Link>
            </DropdownMenuItem>
          )}
          {!isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/suscripcion">
                <Crown size={16} />
                {plan === "free" ? "Hazte Premium" : "Mi suscripción"}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <LogoutMenuItem />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}