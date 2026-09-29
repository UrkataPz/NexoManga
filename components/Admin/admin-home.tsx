import Link from "next/link";
import type { AdminCounts } from "@/lib/admin_queries";

// una tarjeta con un número grande que lleva a su sección
function CounterLink({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-border p-4 hover:bg-accent">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Link>
  );
}

// resumen del admin: cuántas cosas tiene pendientes; cada número lleva a su sección
export function AdminHome({ counts }: { counts: AdminCounts }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Administración</h1>
        <p className="text-muted-foreground">Lo que tienes pendiente. Toca un número para ir a su sección.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <CounterLink label="Obras en revisión" value={counts.pendingWorks} href="/mi-panel/admin/obras" />
        <CounterLink label="Reportes pendientes" value={counts.pendingReports} href="/mi-panel/admin/reportes" />
        <CounterLink label="Suscripciones activas" value={counts.activeSubscriptions} href="/mi-panel/admin/reparto" />
      </div>
    </div>
  );
}
