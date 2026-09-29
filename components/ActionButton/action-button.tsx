"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ActionResult = { error?: string; message?: string };

interface ActionButtonProps {
  // la acción del servidor con sus datos ya puestos (.bind); recibe el motivo si se pidió uno
  action: (reason: string) => Promise<ActionResult>;
  label: string;
  successText: string;
  // si viene, pregunta "¿seguro?" antes de hacer la acción
  confirmText?: string;
  // si viene, pide un motivo con una ventanita antes de hacer la acción
  reasonText?: string;
  variant?: "default" | "outline" | "destructive";
}

// botón que llama a una acción del servidor, avisa el resultado y recarga la página
export function ActionButton({
  action,
  label,
  successText,
  confirmText,
  reasonText,
  variant = "default",
}: ActionButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    let reason = "";
    if (reasonText) {
      const answer = window.prompt(reasonText);
      if (!answer || !answer.trim()) return;
      reason = answer.trim();
    }
    if (confirmText && !window.confirm(confirmText)) return;

    setIsPending(true);
    const result = await action(reason);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? successText);
    router.refresh();
  };

  return (
    <Button size="sm" variant={variant} onClick={handleClick} disabled={isPending}>
      {isPending ? "Procesando..." : label}
    </Button>
  );
}
