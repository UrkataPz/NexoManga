import Link from "next/link";
import { Button } from "@/components/ui/button";

// aviso para el plan gratis: explica qué es de Premium y lleva a suscribirse
export function PremiumNotice({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild size="sm">
        <Link href="/suscripcion">Hazte Premium</Link>
      </Button>
    </div>
  );
}
