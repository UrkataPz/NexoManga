import { createClient } from "@supabase/supabase-js";

// conexión con la llave maestra: se salta las reglas de Supabase, usar SOLO en el servidor
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
