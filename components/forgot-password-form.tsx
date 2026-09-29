"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, authButtonClass, authInputClass, authLinkClass } from "@/components/Auth/auth-card";
import { translateAuthError } from "@/features/auth/auth-rules";

// pide el correo y manda el enlace para crear una contraseña nueva
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Supabase manda un correo con un enlace a /auth/update-password
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    setIsLoading(false);
    if (resetError) {
      setError(translateAuthError(resetError));
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthCard title="Revisa tu correo" subtitle="Te enviamos las instrucciones." badge="¡Listo!">
        <p className="text-sm text-neutral-300">
          Si <strong>{email}</strong> tiene una cuenta, vas a recibir un enlace para crear una
          contraseña nueva.
        </p>
        <Link href="/auth/login" className={`mt-6 inline-block text-sm ${authLinkClass}`}>
          Volver a iniciar sesión
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te mandamos un enlace para crear una nueva.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            placeholder="tucorreo@ejemplo.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authInputClass}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={isLoading} className={authButtonClass}>
          {isLoading ? "Enviando..." : "Enviar enlace"}
        </Button>

        <p className="text-center text-sm text-neutral-400">
          ¿Te acordaste?{" "}
          <Link href="/auth/login" className={authLinkClass}>
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
