"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CardPaymentFormProps {
  // qué se está pagando, por ejemplo "Premium Básico — $4.99 / mes"
  summary: string;
  // monto que dice el botón, por ejemplo "$4.99"
  amountLabel: string;
  // lo que pasa cuando el pago "sale bien" (activar plan, donación...)
  onPay: () => Promise<{ error?: string }>;
  successMessage: string;
  successHref: string;
}

// deja solo números y los agrupa de 4 en 4: "4242 4242 4242 4242"
function formatCardNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

// deja solo números y pone la barra: "1228" → "12/28"
function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

// la tarjeta sirve hasta el último día de su mes de vencimiento
function isExpiryValid(expiry: string): boolean {
  const [month, year] = expiry.split("/").map(Number);
  if (!month || month > 12 || !year) return false;
  return new Date(2000 + year, month, 1) > new Date();
}

// formulario de pago con tarjeta SIMULADO: los datos de la tarjeta no salen del navegador ni se guardan
export function CardPaymentForm({ summary, amountLabel, onPay, successMessage, successHref }: CardPaymentFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // revisa que la tarjeta "parezca" válida y avisa al servidor que el pago salió bien
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) return setError("Escribe el nombre que aparece en la tarjeta.");
    if (number.replace(/\s/g, "").length !== 16) return setError("El número de tarjeta debe tener 16 dígitos.");
    if (!isExpiryValid(expiry)) return setError("La fecha de vencimiento no es válida.");
    if (!/^\d{3,4}$/.test(cvc)) return setError("El CVC debe tener 3 o 4 números.");

    setIsPaying(true);
    setError(null);

    // la tarjeta NO se envía: onPay solo le dice al servidor qué se pagó
    const result = await onPay();
    if (result.error) {
      setError(result.error);
      setIsPaying(false);
      return;
    }

    toast.success(successMessage);
    router.push(successHref);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-5">
      {/* tarjeta de muestra que se va llenando mientras escribes */}
      <div className="flex aspect-[1.6] w-full flex-col justify-between rounded-2xl bg-gradient-to-br from-brand via-brand-dark to-neutral-950 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <span className="font-bold tracking-wider">NexoManga</span>
          <CreditCard size={28} />
        </div>
        <p className="font-mono text-lg tracking-widest sm:text-xl">{number || "•••• •••• •••• ••••"}</p>
        <div className="flex justify-between gap-4 text-xs uppercase">
          <div className="min-w-0">
            <span className="block opacity-70">Titular</span>
            <span className="block truncate">{name || "Tu nombre"}</span>
          </div>
          <div className="shrink-0">
            <span className="block opacity-70">Vence</span>
            {expiry || "MM/AA"}
          </div>
        </div>
      </div>

      <p className="rounded-md bg-muted px-3 py-2 text-sm">{summary}</p>

      <div className="grid gap-2">
        <Label htmlFor="cardName">Nombre en la tarjeta</Label>
        <Input id="cardName" value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cardNumber">Número de tarjeta</Label>
        <Input
          id="cardNumber"
          inputMode="numeric"
          placeholder="4242 4242 4242 4242"
          value={number}
          onChange={(event) => setNumber(formatCardNumber(event.target.value))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="cardExpiry">Vencimiento</Label>
          <Input
            id="cardExpiry"
            inputMode="numeric"
            placeholder="MM/AA"
            value={expiry}
            onChange={(event) => setExpiry(formatExpiry(event.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cardCvc">CVC</Label>
          <Input
            id="cardCvc"
            inputMode="numeric"
            placeholder="123"
            value={cvc}
            onChange={(event) => setCvc(event.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isPaying} className="manga-button">
        {isPaying ? "Procesando pago..." : `Pagar ${amountLabel}`}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Pago simulado: no se cobra dinero y los datos de la tarjeta no se guardan. Puedes usar 4242 4242
        4242 4242.
      </p>
    </form>
  );
}
