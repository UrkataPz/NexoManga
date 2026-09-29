"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authButtonClass, authInputClass } from "@/components/Auth/auth-card";
import { MIN_PASSWORD_LENGTH, translateAuthError } from "@/features/auth/auth-rules";

interface UpdatePasswordFormProps {
  // "auth": pantalla de recuperar contraseña (oscura, vuelve al inicio) · "site": dentro de /perfil
  appearance?: "auth" | "site";
}

// cambia la contraseña del usuario con sesión iniciada
export function UpdatePasswordForm({ appearance = "site" }: UpdatePasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isAuth = appearance === "auth";

  // guarda la contraseña nueva en Supabase
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(translateAuthError(updateError));
      return;
    }

    toast.success("Contraseña actualizada.");
    setPassword("");
    if (isAuth) router.push("/");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-4", !isAuth && "rounded-lg border border-border p-4")}
    >
      <div className="grid gap-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          type="password"
          placeholder="Nueva contraseña"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={isAuth ? authInputClass : undefined}
        />
      </div>
      {error && <p className={cn("text-sm", isAuth ? "text-red-400" : "text-red-500")}>{error}</p>}
      <Button type="submit" disabled={isLoading} className={isAuth ? authButtonClass : undefined}>
        {isLoading ? "Guardando..." : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}
