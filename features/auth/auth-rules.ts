// reglas y mensajes de las pantallas de cuenta (se usan en el navegador)

export const MIN_AGE = 13;
export const MIN_PASSWORD_LENGTH = 6;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export interface SignUpValues {
  username: string;
  email: string;
  birthDate: string;
  password: string;
  repeatPassword: string;
}

// calcula los años cumplidos a partir de una fecha "AAAA-MM-DD"
export function getAge(birthDate: string): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  const today = new Date();
  const birthdayPassed =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  return today.getFullYear() - year - (birthdayPassed ? 0 : 1);
}

// revisa los datos del registro y devuelve el primer error, o null si todo está bien
export function validateSignUp(values: SignUpValues): string | null {
  if (!USERNAME_PATTERN.test(values.username)) {
    return "El nombre de usuario debe tener de 3 a 20 caracteres: letras, números o guion bajo (_).";
  }
  if (!values.birthDate) return "Ingresa tu fecha de nacimiento.";

  const age = getAge(values.birthDate);
  if (Number.isNaN(age) || age > 120) return "La fecha de nacimiento no es válida.";
  if (age < MIN_AGE) return `Debes tener al menos ${MIN_AGE} años para registrarte.`;

  if (values.password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (values.password !== values.repeatPassword) return "Las contraseñas no coinciden.";
  return null;
}

// mensajes de Supabase (en inglés) y su traducción
const AUTH_ERRORS: [string, string][] = [
  ["invalid login credentials", "Correo o contraseña incorrectos."],
  ["email not confirmed", "Todavía no confirmas tu correo. Revisa tu bandeja de entrada."],
  ["user already registered", "Ya existe una cuenta con ese correo."],
  ["password should be", `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`],
  ["should be different", "La nueva contraseña debe ser distinta a la anterior."],
  ["database error saving new user", "No se pudo crear la cuenta. Revisa tus datos e intenta de nuevo."],
  ["rate limit", "Demasiados intentos. Espera un momento e intenta de nuevo."],
  ["for security purposes", "Demasiados intentos. Espera un momento e intenta de nuevo."],
];

// traduce un error de Supabase a un mensaje claro en español
export function translateAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const match = AUTH_ERRORS.find(([english]) => message.includes(english));
  return match ? match[1] : "Ocurrió un error. Intenta de nuevo.";
}
