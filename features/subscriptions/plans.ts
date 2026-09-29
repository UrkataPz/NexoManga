export type PlanId = "free" | "premium_full";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  benefits: string;
}

// los 2 planes: gratis o Premium (precio de ejemplo: el pago es simulado)
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratis",
    price: 0,
    benefits: "Lee los capítulos libres, usa 3 desbloqueos VLN al día y ve publicidad.",
  },
  {
    id: "premium_full",
    name: "Premium",
    price: 4.99,
    benefits: "Sin publicidad y sin límites: lee todos los capítulos VLN y Premium, y personaliza tu perfil con foto y banner.",
  },
];

// busca un plan por su id
export function findPlan(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

// muestra un precio como dinero: 4.99 → "$4.99"
export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
