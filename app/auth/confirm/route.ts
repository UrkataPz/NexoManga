import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// recibe el enlace del correo (confirmar cuenta o cambiar contraseña) y valida el código
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // código válido: lo manda a donde iba
      redirect(next);
    } else {
      // código inválido o vencido: pantalla de error
      redirect(`/auth/error?error=${error?.message}`);
    }
  }

  // el enlace llegó incompleto: pantalla de error
  redirect(`/auth/error?error=No token hash or type`);
}
