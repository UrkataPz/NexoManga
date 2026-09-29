"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationList } from "@/components/Notifications/notification-list";
import { markNotificationsRead } from "@/features/notifications/mark-read";
import type { NotificationItem } from "@/lib/notifications_queries";

interface NotificationBellProps {
  items: NotificationItem[];
  showPanelLink: boolean;
}

// campanita del nav: cuenta las notificaciones sin leer y las muestra al abrirla
export function NotificationBell({ items, showPanelLink }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(items.filter((item) => !item.read).length);

  // al abrir el menú, marca todo como leído
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      setUnreadCount(0);
      markNotificationsRead();
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-brand data-[state=open]:bg-brand"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-1">
        <p className="px-3 py-2 text-sm font-semibold">Notificaciones</p>
        <DropdownMenuSeparator />
        {/* al tocar una notificación se cierra el menú */}
        <div className="max-h-96 overflow-y-auto" onClick={() => setIsOpen(false)}>
          <NotificationList items={items} />
        </div>
        {showPanelLink && (
          <>
            <DropdownMenuSeparator />
            <Link
              href="/mi-panel/notificaciones"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Ver todas
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
