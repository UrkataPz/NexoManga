"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, authButtonClass, authInputClass, authLinkClass } from "@/components/Auth/auth-card";
import { translateAuthError } from "@/features/auth/auth-rules";

// formulario de inicio de sesión con correo y contraseña
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // inicia sesión en Supabase y, si sale bien, vuelve al inicio
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setError(translateAuthError(loginError));
      setIsLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <AuthCard title="Iniciar sesión" subtitle="Tu biblioteca te está esperando." badge="¡Hola!">
      <form onSubmit={handleLogin} className="flex flex-col gap-5">
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

        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Contraseña</Label>
            <Link href="/auth/forgot-password" className="ml-auto text-xs text-neutral-400 hover:text-brand">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authInputClass}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={isLoading} className={authButtonClass}>
          {isLoading ? "Entrando..." : "Entrar"}
        </Button>

        <p className="text-center text-sm text-neutral-400">
          ¿No tienes cuenta?{" "}
          <Link href="/auth/sign-up" className={authLinkClass}>
            Regístrate
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
