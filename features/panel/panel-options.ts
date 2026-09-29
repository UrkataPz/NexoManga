import {
  Bell,
  BookCheck,
  FileText,
  Flag,
  Languages,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  ScrollText,
  Upload,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface PanelItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: { label: string; href: string }[];
}

export interface PanelSection {
  title: string | null;
  role: string | null;
  items: PanelItem[];
}

// roles que pueden entrar a Mi panel (el admin ve solo su sección)
export const PANEL_ROLES = ["author", "translator", "admin"];

// revisa si el usuario tiene algún rol que le permita entrar a Mi panel
export function canAccessPanel(roles: string[]): boolean {
  return roles.some((role) => PANEL_ROLES.includes(role));
}

// opciones del menú lateral de Mi panel, agrupadas por rol
export const PANEL_SECTIONS: PanelSection[] = [
  {
    title: null,
    role: null,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/mi-panel" },
      { label: "Notificaciones", icon: Bell, href: "/mi-panel/notificaciones" },
    ],
  },
  {
    title: "Autor",
    role: "author",
    items: [
      { label: "Borradores", icon: FileText, href: "/mi-panel/borradores" },
      {
        label: "Publicar",
        icon: Upload,
        children: [
          { label: "Publicar obra", href: "/mi-panel/publicar/obra" },
          { label: "Publicar capítulo", href: "/mi-panel/publicar/capitulo" },
          { label: "Modificar obra", href: "/mi-panel/publicar/modificar-obra" },
          { label: "Modificar capítulo", href: "/mi-panel/publicar/modificar-capitulo" },
        ],
      },
      { label: "Traducciones", icon: Languages, href: "/mi-panel/traducciones" },
    ],
  },
  {
    title: "Traductor",
    role: "translator",
    items: [
      { label: "Mis trabajos", icon: ListChecks, href: "/mi-panel/mis-trabajos" },
      { label: "Mi Grupo", icon: Users, href: "/mi-panel/mi-grupo" },
    ],
  },
  {
    title: "Administración",
    role: "admin",
    items: [
      { label: "Resumen", icon: LayoutDashboard, href: "/mi-panel" },
      { label: "Obras en revisión", icon: BookCheck, href: "/mi-panel/admin/obras" },
      { label: "Reportes", icon: Flag, href: "/mi-panel/admin/reportes" },
      { label: "Reparto", icon: Wallet, href: "/mi-panel/admin/reparto" },
      { label: "Anuncios", icon: Megaphone, href: "/mi-panel/admin/anuncios" },
      { label: "Bitácora", icon: ScrollText, href: "/mi-panel/admin/bitacora" },
    ],
  },
];
