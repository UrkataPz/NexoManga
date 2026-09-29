import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// junta clases de Tailwind sin que se pisen entre ellas
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// color estable por nombre (mismo nombre = mismo color) para avatares sin foto
export function seedToHslColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 45%)`;
}

// Supabase manda algunas relaciones como objeto o como lista: devuelve siempre el primero
export function firstOf<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}