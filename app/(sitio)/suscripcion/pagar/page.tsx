import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { findPlan, formatPrice } from "@/features/subscriptions/plans";
import { subscribe } from "@/features/subscriptions/subscribe";
import { CardPaymentForm } from "@/components/Payment/card-payment-form";

interface PagarPageProps {
  searchParams: Promise<{ plan?: string }>;
}

// pago del plan elegido con el formulario de tarjeta simulado
export default async function PagarPage({ searchParams }: PagarPageProps) {
  const { plan: planId = "" } = await searchParams;
  const plan = findPlan(planId);

  if (!plan || plan.price === 0) {
    redirect("/suscripcion");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <Link href="/suscripcion" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} />
          Elegir otro plan
        </Link>
        <h1 className="text-2xl font-bold">Confirmar pago</h1>
      </div>

      <CardPaymentForm
        summary={`${plan.name} — ${formatPrice(plan.price)} / mes`}
        amountLabel={formatPrice(plan.price)}
        // .bind deja la acción lista con el plan ya puesto; el formulario solo la llama
        onPay={subscribe.bind(null, plan.id)}
        successMessage={`¡Listo! Ya tienes ${plan.name}.`}
        successHref="/suscripcion"
      />
    </div>
  );
}
