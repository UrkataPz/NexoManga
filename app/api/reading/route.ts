import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordHeartbeat, startReading } from "@/features/reader/record-reading";

// recibe los datos del lector: "abrí el capítulo" y los latidos con el tiempo por página
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null); //recibe el json enviado por use-reading-tracker.ts

  if (body?.action === "open" && typeof body.chapterId === "string") {  //revisa si los datos que trae el navegador son los que se necesitan
    const translationId = typeof body.translationId === "string" ? body.translationId : null; //verifica si el navegador mando id de traduccion, si no, usa el original
    const sessionId = await startReading(userId, body.chapterId, translationId); //llama a startReading de record-reading.ts
    return NextResponse.json({ sessionId });
  }

  if (body?.action === "heartbeat" && typeof body.sessionId === "string" && Array.isArray(body.pages)) {
    const valid = await recordHeartbeat(userId, body.sessionId, body.pages);
    return NextResponse.json({ valid });
  }

  return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
}
