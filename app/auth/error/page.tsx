import Link from "next/link";
import { AuthCard, authLinkClass } from "@/components/Auth/auth-card";

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

// pantalla de error del enlace de confirmación o de recuperar contraseña
export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error } = await searchParams;

  return (
    <AuthCard title="Algo salió mal" subtitle="El enlace no es válido o ya se usó." badge="¡Ups!">
      {error && <p className="text-xs text-neutral-500">Detalle: {error}</p>}
      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link href="/auth/login" className={authLinkClass}>
          Volver a iniciar sesión
        </Link>
        <Link href="/auth/forgot-password" className={authLinkClass}>
          Pedir otro enlace de recuperación
        </Link>
      </div>
    </AuthCard>
  );
}
