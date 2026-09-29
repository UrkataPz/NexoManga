"use server";

import { createClient } from "@/lib/supabase/server";
import { activateSubscription, cancelActiveSubscription } from "@/lib/payments_queries";
import { findPlan } from "@/features/subscriptions/plans";

type ActionResult = { error?: string };

// devuelve el id del usuario logueado, o null si no hay sesión
async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  return authData?.claims?.sub ?? null;
}

// "paga" un plan (simulado): el servidor crea la suscripción y registra el cobro
export async function subscribe(planId: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "Inicia sesión para suscribirte." };

  const plan = findPlan(planId);
  if (!plan || plan.price === 0) return { error: "Plan inválido." };

  const error = await activateSubscription(userId, plan.id, plan.price);
  return error ? { error } : {};
}

// vuelve al plan gratis: cancela la suscripción activa
export async function cancelSubscription(): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };

  await cancelActiveSubscription(userId);
  return {};
}
