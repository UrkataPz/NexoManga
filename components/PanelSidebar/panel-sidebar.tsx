"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PANEL_SECTIONS } from "@/features/panel/panel-options";
import { cn } from "@/lib/utils";

interface PanelSidebarProps {
  roles: string[];
  username: string;
  email: string;
  avatarUrl: string | null;
  planLabel: string;
}

const linkClass =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors";
const activeClass = "bg-accent text-foreground";
const inactiveClass = "text-muted-foreground hover:bg-accent hover:text-foreground";

// menú lateral de Mi panel: muestra las opciones según el rol y resalta la página actual
export function PanelSidebar({ roles, username, email, avatarUrl, planLabel }: PanelSidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // el admin ve solo su sección; el resto, la general y las de sus roles
  const isAdmin = roles.includes("admin");
  const visibleSections = PANEL_SECTIONS.filter((section) =>
    isAdmin ? section.role === "admin" : section.role === null || roles.includes(section.role),
  );

  // Dashboard se marca solo en su ruta exacta, el resto también en sus subrutas
  const isActive = (href: string) =>
    href === "/mi-panel" ? pathname === href : pathname.startsWith(href);

  const closeMobile = () => setIsMobileOpen(false);

  const logo = (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/nexomangaLetters.png"
        alt="NexoManga"
        width={2170}
        height={725}
        className="h-8 w-auto"
      />
    </Link>
  );

  const sidebarContent = (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar imageUrl={avatarUrl} name={username} className="h-16 w-16 text-2xl" />
        <div className="w-full min-w-0">
          <p className="truncate font-semibold">{username}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <Badge variant="secondary">{planLabel}</Badge>
      </div>

      <nav className="flex flex-col gap-2">
        {visibleSections.map((section) => (
          <div
            key={section.title ?? "general"}
            className="flex flex-col gap-1 border-t border-border pt-2"
          >
            {section.title && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </p>
            )}

            {section.items.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMobile}
                  className={cn(linkClass, isActive(item.href) ? activeClass : inactiveClass)}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ) : (
                <Accordion
                  key={item.label}
                  type="single"
                  collapsible
                  defaultValue={
                    item.children?.some((child) => isActive(child.href)) ? item.label : undefined
                  }
                >
                  <AccordionItem value={item.label} className="border-none">
                    <AccordionTrigger className={cn(linkClass, inactiveClass, "hover:no-underline")}>
                      <span className="flex items-center gap-3">
                        <item.icon size={18} />
                        {item.label}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-1 pb-1 pl-8">
                      {(item.children ?? []).map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={closeMobile}
                          className={cn(
                            linkClass,
                            "py-1.5",
                            isActive(child.href) ? activeClass : inactiveClass,
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ),
            )}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-2">
        <Link href="/" className={cn(linkClass, inactiveClass)}>
          <ArrowLeft size={18} />
          Regresar a NexoManga
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* celular: barra arriba con botón para abrir el menú */}
      <header className="border-b border-border lg:hidden">
        <div className="flex items-center justify-between p-4">
          {logo}
          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {isMobileOpen && <div className="flex flex-col px-4 pb-4">{sidebarContent}</div>}
      </header>

      {/* escritorio: columna fija a la izquierda */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:border-r lg:border-border lg:p-4">
        {logo}
        {sidebarContent}
      </aside>
    </>
  );
}
