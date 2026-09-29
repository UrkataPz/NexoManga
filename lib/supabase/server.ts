import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// conexión a Supabase desde el servidor con la sesión del usuario (crear una nueva en cada función)
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // desde un componente de servidor no se pueden escribir cookies: el middleware ya las renueva
          }
        },
      },
    },
  );
}
