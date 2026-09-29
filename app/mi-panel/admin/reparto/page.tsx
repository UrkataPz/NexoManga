import { getRecentPayouts } from "@/lib/admin_queries";
import { calculatePayout } from "@/features/admin/payout";
import { ActionButton } from "@/components/ActionButton/action-button";

// reparto: el botón que paga a autores y traductores y la lista de los últimos pagos
export default async function AdminRepartoPage() {
  const payouts = await getRecentPayouts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Reparto</h1>
        <p className="text-muted-foreground">
          Reparte el 70 % de lo cobrado en suscripciones desde el último reparto entre autores y traductores,
          según el valor de sus lecturas válidas.
        </p>
      </div>

      <div>
        <ActionButton
          action={calculatePayout}
          label="Calcular reparto"
          confirmText="¿Calcular el reparto ahora? Los pagos quedan guardados."
          successText="Reparto hecho."
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Últimos pagos</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay pagos.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1">Fecha</th>
                <th className="py-1">Para</th>
                <th className="py-1">Tipo</th>
                <th className="py-1 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-t border-border">
                  <td className="py-1">{payout.dateLabel}</td>
                  <td className="py-1">{payout.recipient}</td>
                  <td className="py-1">{payout.typeLabel}</td>
                  <td className="py-1 text-right">${payout.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
