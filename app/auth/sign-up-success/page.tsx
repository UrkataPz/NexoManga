import Link from "next/link";
import { AuthCard, authLinkClass } from "@/components/Auth/auth-card";

// pantalla después de registrarse, cuando Supabase pide confirmar el correo
export default function SignUpSuccessPage() {
  return (
    <AuthCard title="¡Ya casi!" subtitle="Solo falta confirmar tu correo." badge="¡Bien!">
      <p className="text-sm text-neutral-300">
        Te enviamos un correo con un enlace de confirmación. Ábrelo y después inicia sesión para
        empezar a leer.
      </p>
      <Link href="/auth/login" className={`mt-6 inline-block text-sm ${authLinkClass}`}>
        Ir a iniciar sesión
      </Link>
    </AuthCard>
  );
}
