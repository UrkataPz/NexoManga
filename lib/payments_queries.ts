import { createAdminClient } from "@/lib/supabase/admin";

// escrituras de suscripciones y cobros: usan la llave maestra, solo se llaman desde el servidor

// cancela la suscripción activa del usuario (si tiene) y lo anota en el historial
export async function cancelActiveSubscription(userId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancellation_date: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active")
    .select("id");

  if (error) console.error(error);
  if (!data || data.length === 0) return;

  await supabase
    .from("subscription_events")
    .insert(data.map((row) => ({ subscription_id: row.id, event_type: "cancelled" })));
}

// activa un plan (pago simulado): nueva suscripción por 30 días + su evento + el cobro
export async function activateSubscription(userId: string, plan: string, amount: number): Promise<string | null> {
  const supabase = createAdminClient();
  await cancelActiveSubscription(userId);

  const now = new Date();
  const renewal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan,
      status: "active",
      start_date: now.toISOString(),
      renewal_date: renewal.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    return "No se pudo activar el plan. Intenta de nuevo.";
  }

  await supabase.from("subscription_events").insert({ subscription_id: data.id, event_type: "started" });

  // el cobro queda en transactions: de ahí saldrá el fondo que se reparte a los autores
  const { error: paymentError } = await supabase.from("transactions").insert({
    type: "subscription",
    source_user_id: userId,
    amount,
    status: "paid",
    paid_at: now.toISOString(),
  });
  if (paymentError) console.error(paymentError);

  return null;
}
