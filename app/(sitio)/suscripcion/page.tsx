import Link from "next/link";
import { getCurrentPlan } from "@/lib/subscriptions_queries";
import { PLANS, formatPrice } from "@/features/subscriptions/plans";
import { CancelSubscriptionButton } from "@/components/Payment/cancel-subscription-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// selector de planes: muestra los 3 planes y marca el actual
export default async function SuscripcionPage() {
  const currentPlan = await getCurrentPlan();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Elige tu plan</h1>
        <p className="text-muted-foreground">Pago simulado: no se cobra dinero real.</p>
      </div>

      <div className="mx-auto grid w-full max-w-3xl gap-4 md:grid-cols-2">
        {PLANS.map((plan) => {
          // solo hay gratis o Premium: cualquier plan pagado cuenta como Premium
          const isCurrent = plan.price === 0 ? currentPlan === "free" : currentPlan !== "free";
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col gap-4 rounded-xl border-2 bg-card p-6",
                isCurrent ? "border-brand" : "border-border",
              )}
            >
              <div>
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="text-3xl font-black">
                  {formatPrice(plan.price)}
                  <span className="text-sm font-normal text-muted-foreground"> / mes</span>
                </p>
              </div>

              <p className="flex-1 text-sm text-muted-foreground">{plan.benefits}</p>

              {isCurrent ? (
                <Badge className="self-start bg-brand text-white hover:bg-brand">Tu plan actual</Badge>
              ) : plan.price === 0 ? (
                <CancelSubscriptionButton />
              ) : (
                <Button asChild className="manga-button">
                  <Link href={`/suscripcion/pagar?plan=${plan.id}`}>Elegir {plan.name}</Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
