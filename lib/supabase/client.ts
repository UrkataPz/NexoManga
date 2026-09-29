import { createBrowserClient } from "@supabase/ssr";

// conexión a Supabase desde el navegador (login y registro)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
