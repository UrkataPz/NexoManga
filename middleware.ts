import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

// la "puerta" de toda la app: corre antes de cada página (ver lib/supabase/proxy.ts)
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // todas las rutas menos archivos internos de Next, el ícono y las imágenes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
