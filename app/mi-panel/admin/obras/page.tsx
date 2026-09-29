import Link from "next/link";
import { getPendingWorks } from "@/lib/admin_queries";
import { approveWork, rejectWork } from "@/features/admin/admin-actions";
import { ActionButton } from "@/components/ActionButton/action-button";

// obras en revisión: el admin las abre, las revisa y las aprueba o las rechaza con un motivo
export default async function AdminObrasPage() {
  const works = await getPendingWorks();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Obras en revisión</h1>
        <p className="text-muted-foreground">
          La primera obra de cada autor espera aquí. Ábrela para revisarla antes de decidir.
        </p>
      </div>

      {works.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay obras esperando revisión.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {works.map((work) => (
            <li
              key={work.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div>
                <Link href={`/obra/${work.id}`} className="font-medium underline">
                  {work.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  de {work.author} · {work.dateLabel}
                </p>
              </div>
              <div className="flex gap-2">
                <ActionButton action={approveWork.bind(null, work.id)} label="Aprobar" successText="Obra aprobada." />
                <ActionButton
                  action={rejectWork.bind(null, work.id)}
                  label="Rechazar"
                  reasonText="¿Por qué rechazas esta obra? (el autor lo va a ver)"
                  successText="Obra rechazada."
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
