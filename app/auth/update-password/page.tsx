import { AuthCard } from "@/components/Auth/auth-card";
import { UpdatePasswordForm } from "@/components/update-password-form";

// pantalla a la que llega el enlace del correo de recuperar contraseña
export default function UpdatePasswordPage() {
  return (
    <AuthCard title="Nueva contraseña" subtitle="Escribe la contraseña que vas a usar desde ahora.">
      <UpdatePasswordForm appearance="auth" />
    </AuthCard>
  );
}
