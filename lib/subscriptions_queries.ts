import { createClient } from "@/lib/supabase/server";

// Simulado por ahora: no hay pasarela de pago real, "suscribirse" va a ser un botón que
// simplemente crea una fila aquí con plan/status. Esta función solo pregunta cuál es el
// plan activo más reciente del usuario logueado.
export async function getCurrentPlan(): Promise<string> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) return "free";

  const { data } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.plan ?? "free";
}
