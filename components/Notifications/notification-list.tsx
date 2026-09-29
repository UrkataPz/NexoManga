import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/lib/notifications_queries";

interface NotificationListProps {
  items: NotificationItem[];
}

// lista de notificaciones: la usan la campanita del nav y la página del panel
export function NotificationList({ items }: NotificationListProps) {
  if (items.length === 0) {
    return <p className="p-4 text-center text-sm text-muted-foreground">No tienes notificaciones.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className={cn(
              "flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent",
              !item.read && "bg-accent/50 font-medium",
            )}
          >
            <span>{item.message}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{item.dateLabel}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
