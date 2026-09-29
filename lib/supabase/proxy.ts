import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// rutas que cualquiera puede ver sin sesión (incluye sus subrutas)
const PUBLIC_ROUTES = ["/anuncios", "/auth", "/biblioteca", "/busqueda-avanzada", "/comunidad", "/obra"];

// renueva la sesión en cada visita y manda al login a quien entra sin sesión a una ruta privada
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // cliente de Supabase que lee y escribe las cookies de la sesión
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // no poner código entre crear el cliente y getClaims: si no, la sesión se puede cerrar sola
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    PUBLIC_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // hay que devolver esta misma respuesta: lleva las cookies de la sesión renovada
  return supabaseResponse;
}
