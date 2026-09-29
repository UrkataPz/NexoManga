"use server";

import { getAdminId, logAdminAction } from "@/features/admin/admin-tools";
import {
  getGroupSplit,
  getLastPayoutDate,
  getSubscriptionIncomeSince,
  getValidReadingsSince,
} from "@/lib/admin_queries";
import { insertPayments, type NewPayment } from "@/lib/payout_queries";

// parte de lo cobrado en suscripciones que va a los creadores (el 30 % restante es de la plataforma)
const CREATORS_SHARE = 0.7;
// parte de una lectura de traducción que va a quien tradujo (el resto es del autor)
const TRANSLATOR_SHARE = 0.13;

type PayoutResult = { error?: string; message?: string };

// redondea a centavos
function toCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// suma un monto a lo que ya le tocaba a una persona
function addTo(totals: Map<string, number>, userId: string, amount: number) {
  totals.set(userId, (totals.get(userId) ?? 0) + amount);  // lo que ya tenía (0 en caso de ser primera vez el pago) + el monto nuevo, y lo guarda
}

// reparte el fondo del periodo entre autores y traductores según el valor de sus lecturas válidas
// Ejemplo en los comentarios: fondo $20 · L1 = cap. 5 ES de Ana (valor 50) · L2 y L3 = caps. 5 y 6 EN traducidos por Scan Luna, subidos por Dani y Eli (valor 25 c/u) · Scan Luna: Carla líder 0 %, Dani 30 %, Eli 20 %
export async function calculatePayout(): Promise<PayoutResult> { // devuelve { message } si salió bien o { error } si no
  const adminId = await getAdminId(); // id del admin que presionó el botón; null si quien llama no es admin
  if (!adminId) return { error: "Solo el administrador puede calcular el reparto." }; // la puerta: nadie más puede repartir

  // 1. el periodo va desde el último reparto hasta ahora
  const since = await getLastPayoutDate(); // fecha del último pago de reparto (null si nunca hubo uno)

  // 2. el fondo: 70 % de lo cobrado en suscripciones en el periodo
  const fund = toCents((await getSubscriptionIncomeSince(since)) * CREATORS_SHARE); // suma los cobros desde "since", × 0.7 y redondea. Ej: $28.57 × 0.7 = 19.999 → $20.00
  if (fund <= 0) return { error: "No hay fondo para repartir: no hubo cobros desde el último reparto." }; // sin cobros no se guarda nada: las lecturas esperan al siguiente reparto

  // 3. las lecturas válidas del periodo y su valor total
  const readings = await getValidReadingsSince(since); // la lista de lecturas a pagar (cada una con su valor, autor y, si aplica, traductor y grupo)
  const totalValue = readings.reduce((total, reading) => total + reading.value, 0); // suma el valor de todas: 50 + 25 + 25 = 100 (reduce arranca en 0 y va sumando)
  if (totalValue <= 0) return { error: "No hay lecturas válidas desde el último reparto." }; // sin lecturas no hay a quién repartir

  // 4. cuánto le toca a cada persona (por separado: autores, traductores y grupos)
  const toAuthors = new Map<string, number>(); // libreta de autores: id → dinero acumulado
  const toTranslators = new Map<string, number>(); // libreta de traductores: id → dinero acumulado
  const toGroups = new Map<string, { amount: number; uploaderId: string }>(); // libreta de grupos: id → lo que juntó el grupo y quién subió (por si el grupo estuviera vacío)

  for (const reading of readings) { // recorre las lecturas una por una
    // lo que vale esta lectura en dinero
    const money = (reading.value / totalValue) * fund; // su parte del fondo: L1 = 50 ÷ 100 × 20 = $10 · L2 y L3 = 25 ÷ 100 × 20 = $5

    // lectura del original: todo es del autor
    if (!reading.translatorId) { // sin traductor = se leyó el original
      if (reading.authorId) addTo(toAuthors, reading.authorId, money); // L1: Ana +$10 (si la obra no tuviera autor, ese dinero no se asigna)
      continue; // salta a la siguiente lectura
    }

    // lectura de una traducción: 13 % para quien tradujo y el resto para el autor
    const translatorMoney = money * TRANSLATOR_SHARE; // L2: 5 × 0.13 = $0.65
    if (reading.authorId) addTo(toAuthors, reading.authorId, money - translatorMoney); // L2: Ana + (5 − 0.65) = +$4.35

    if (reading.groupId) { // la tradujo un grupo: su parte va a la libreta del GRUPO, todavía no a Dani
      const current = toGroups.get(reading.groupId)?.amount ?? 0; // lo que el grupo ya llevaba (0 si es la primera lectura del grupo)
      toGroups.set(reading.groupId, { amount: current + translatorMoney, uploaderId: reading.translatorId }); // tras L2: Scan Luna $0.65 · tras L3: $1.30 (uploaderId queda con el último que subió: Eli)
    } else {
      addTo(toTranslators, reading.translatorId, translatorMoney); // traductor suelto: sus $0.65 directo a su libreta
    }
  }
  // al terminar el recorrido: Ana $18.70 (10 + 4.35 + 4.35) · Scan Luna $1.30

  // 5. lo de cada grupo se reparte con sus porcentajes; lo que nadie tiene asignado es del líder
  for (const [groupId, group] of toGroups) { // recorre la libreta de grupos: cada vuelta trae el id del grupo y lo que juntó
    const split = await getGroupSplit(groupId); // sus porcentajes y su líder. Ej: { leaderId: Carla, shares: [Carla 0, Dani 30, Eli 20] }

    // grupo vacío: se le paga a quien subió la traducción
    if (!split.leaderId) { // sin líder = ya no queda nadie en el grupo
      addTo(toTranslators, group.uploaderId, group.amount); // todo para quien subió la traducción
      continue; // siguiente grupo
    }

    let assigned = 0; // cuánto del dinero del grupo ya se repartió
    for (const share of split.shares) { // a cada miembro, su porcentaje
      const amount = (group.amount * share.pct) / 100; // Carla 1.30 × 0 % = $0 · Dani 1.30 × 30 % = $0.39 · Eli 1.30 × 20 % = $0.26
      addTo(toTranslators, share.userId, amount); // lo suma a su libreta de traductor
      assigned += amount; // va contando lo repartido: 0 → 0.39 → 0.65
    }
    addTo(toTranslators, split.leaderId, group.amount - assigned); // lo que sobra es del líder: 1.30 − 0.65 = $0.65 para Carla (así nunca se pierde dinero)
  }

  // 6. un pago por persona, en centavos (la BD no acepta montos en 0)
  const payments: NewPayment[] = []; // la lista de pagos a guardar
  for (const [userId, amount] of toAuthors) { // un pago por cada autor de la libreta
    payments.push({ userId, type: "global_fund", amount: toCents(amount) }); // tipo "global_fund" (pago de autor), redondeado a centavos. Ej: Ana $18.70
  }
  for (const [userId, amount] of toTranslators) { // un pago por cada traductor de la libreta
    payments.push({ userId, type: "translator_payment", amount: toCents(amount) }); // tipo "translator_payment". Ej: Carla $0.65, Dani $0.39, Eli $0.26
  }
  const validPayments = payments.filter((payment) => payment.amount > 0); // quita los de $0 (la base exige amount > 0). Resultado: 4 pagos que suman exactamente $20

  const saveError = await insertPayments(validPayments); // los guarda como pagados con la llave maestra (transactions no deja insertar a nadie más)
  if (saveError) return { error: saveError }; // si falló el guardado, avisa y no anota nada en la bitácora

  // 7. se anota en la bitácora y se avisa el resultado
  const message = `Reparto hecho: $${fund.toFixed(2)} entre ${readings.length} lecturas válidas (${validPayments.length} pagos).`; // Ej: "Reparto hecho: $20.00 entre 3 lecturas válidas (4 pagos)." (toFixed(2) = siempre 2 decimales)
  await logAdminAction(adminId, "Calculó el reparto", "reparto", null, message); // queda en la bitácora del admin (la próxima vez, getLastPayoutDate devolverá la hora de estos pagos)
  return { message }; // el botón muestra este mensaje en un aviso
}
