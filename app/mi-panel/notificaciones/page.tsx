import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyNotifications } from "@/lib/notifications_queries";
import { NotificationList } from "@/components/Notifications/notification-list";

// página de notificaciones dentro de Mi panel
export default async function NotificacionesPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const items = await getMyNotifications(userId, 100);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        <p className="text-muted-foreground">Capítulos nuevos, obras nuevas y el estado de tus obras.</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-1">
        <NotificationList items={items} />
      </div>
    </div>
  );
}
