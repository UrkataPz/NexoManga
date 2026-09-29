"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelSubscription } from "@/features/subscriptions/subscribe";

// botón "Volver a Gratis": cancela la suscripción Premium activa
export function CancelSubscriptionButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  // pide confirmación, cancela y recarga la página de planes
  const handleClick = async () => {
    if (!window.confirm("¿Cancelar tu suscripción y volver al plan gratis?")) return;
    setIsPending(true);
    const result = await cancelSubscription();
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Volviste al plan gratis.");
    router.refresh();
  };

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      {isPending ? "Cancelando..." : "Volver a Gratis"}
    </Button>
  );
}
