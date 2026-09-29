"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/comunidad", label: "Comunidad" },
  { href: "/comunidad/descubre", label: "Descubre" },
  { href: "/comunidad/traducir", label: "Traducir" },
];

// las 3 pestañas de comunidad; resalta la página actual
export function CommunityTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 border-b border-border">
      {TABS.map((tab) => {
        // "/comunidad" se compara exacto; si no, quedaría marcada también en sus subpáginas
        const isActive = tab.href === "/comunidad" ? pathname === "/comunidad" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground",
              isActive && "border-brand text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
