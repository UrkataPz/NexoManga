import Link from "next/link";
import { getPendingReports } from "@/lib/admin_queries";
import { resolveReport } from "@/features/admin/admin-actions";
import { ActionButton } from "@/components/ActionButton/action-button";

// reportes pendientes: el admin revisa lo reportado y lo marca como revisado o lo descarta
export default async function AdminReportesPage() {
  const reports = await getPendingReports();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">
          Obras y usuarios que la comunidad reportó. Ábrelos para ver de qué se trata.
        </p>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay reportes pendientes.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <Link href={report.targetHref} className="font-medium underline">
                  {report.targetLabel}
                </Link>
                <p className="text-sm">{report.reason}</p>
                <p className="text-xs text-muted-foreground">
                  reportado por {report.reporter} · {report.dateLabel}
                </p>
              </div>
              <div className="flex gap-2">
                <ActionButton
                  action={resolveReport.bind(null, report.id, "reviewed")}
                  label="Revisado"
                  successText="Reporte marcado como revisado."
                />
                <ActionButton
                  action={resolveReport.bind(null, report.id, "dismissed")}
                  label="Descartar"
                  successText="Reporte descartado."
                  variant="outline"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
