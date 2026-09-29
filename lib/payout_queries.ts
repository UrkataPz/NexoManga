import { createAdminClient } from "@/lib/supabase/admin";



export interface NewPayment {
  userId: string;
  type: "global_fund" | "translator_payment";
  amount: number;
}

// guarda un pago "pagado" por persona; devuelve el error o null si salió bien
export async function insertPayments(payments: NewPayment[]): Promise<string | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("transactions").insert(
    payments.map((payment) => ({
      type: payment.type,
      target_user_id: payment.userId,
      amount: payment.amount,
      status: "paid",
      paid_at: now,
    })),
  );

  if (error) {
    console.error(error);
    return "No se pudieron guardar los pagos.";
  }
  return null;
}
