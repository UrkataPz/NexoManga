// días que cubren las estadísticas por obra
export const DASHBOARD_DAYS = 30;

// nombre de cada tipo de pago en la lista de ganancias
export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  global_fund: "Reparto (autor)",
  translator_payment: "Reparto (traducción)",
  direct_support: "Apoyo de un lector",
};

// porcentaje de aperturas que terminaron en lectura completa
export function getCompletionRate(opens: number, completions: number): number {
  return opens > 0 ? Math.round((completions / opens) * 100) : 0;
}
