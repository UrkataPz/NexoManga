import { getAdminLog } from "@/lib/admin_queries";

// las últimas acciones del admin: quién hizo qué y cuándo
export default async function AdminBitacoraPage() {
  const entries = await getAdminLog();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Bitácora</h1>
        <p className="text-muted-foreground">Las últimas 50 acciones del administrador.</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay acciones.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-border bg-card p-3 text-sm">
              <p>
                <span className="font-medium">{entry.admin}</span> · {entry.action}
              </p>
              {entry.note && <p className="text-muted-foreground">{entry.note}</p>}
              <p className="text-xs text-muted-foreground">{entry.dateLabel}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
