"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, authButtonClass, authInputClass, authLinkClass } from "@/components/Auth/auth-card";
import { MIN_AGE, translateAuthError, validateSignUp } from "@/features/auth/auth-rules";

// formulario de registro: los datos que pide la tabla users (nombre de usuario y fecha de nacimiento)
export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // valida, revisa que el nombre esté libre y crea la cuenta en Supabase
  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      username: String(formData.get("username") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      birthDate: String(formData.get("birthDate") ?? ""),
      password: String(formData.get("password") ?? ""),
      repeatPassword: String(formData.get("repeatPassword") ?? ""),
    };

    const validationError = validateSignUp(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    // el nombre de usuario es único en la base de datos: se revisa antes para dar un mensaje claro
    const { data: taken } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("username", values.username)
      .maybeSingle();

    if (taken) {
      setError("Ese nombre de usuario ya está en uso.");
      setIsLoading(false);
      return;
    }

    // username y birth_date viajan como "metadata": el trigger handle_new_user los copia a la tabla users
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: values.username, birth_date: values.birthDate },
      },
    });

    if (signUpError) {
      setError(translateAuthError(signUpError));
      setIsLoading(false);
      return;
    }

    // si Supabase no pide confirmar el correo, la sesión ya queda iniciada
    if (data.session) {
      toast.success(`¡Bienvenido a NexoManga, ${values.username}!`);
      router.push("/");
      router.refresh();
      return;
    }

    router.push("/auth/sign-up-success");
  };

  return (
    <AuthCard title="Crear cuenta" subtitle="Únete para leer, publicar y traducir." badge="¡Únete!">
      <form onSubmit={handleSignUp} className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label htmlFor="username">Nombre de usuario</Label>
          <Input
            id="username"
            name="username"
            placeholder="pedro_123"
            required
            maxLength={20}
            autoComplete="username"
            className={authInputClass}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="tucorreo@ejemplo.com"
            required
            autoComplete="email"
            className={authInputClass}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="birthDate">Fecha de nacimiento</Label>
          <Input id="birthDate" name="birthDate" type="date" required className={authInputClass} />
          <span className="text-xs text-neutral-500">Debes tener al menos {MIN_AGE} años.</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className={authInputClass}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="repeatPassword">Repetir contraseña</Label>
            <Input
              id="repeatPassword"
              name="repeatPassword"
              type="password"
              required
              autoComplete="new-password"
              className={authInputClass}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={isLoading} className={authButtonClass}>
          {isLoading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>

        <p className="text-center text-sm text-neutral-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" className={authLinkClass}>
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
