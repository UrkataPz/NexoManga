"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { unlockChapter } from "@/features/vln/unlock-chapter";

interface VlnUnlockButtonProps {
  chapterId: string;
  // idioma que se venía leyendo (solo desde la pantalla de bloqueo del lector)
  lang?: string;
  remaining: number;
  initialUnlocked: boolean;
}

// Botón de "Desbloquear" para un capítulo VLN. Una vez desbloqueado (ya sea porque ya lo
// estaba al cargar la página, o porque se acaba de gastar un intento aquí mismo), se
// convierte en el link normal de "Leer capítulo".
export function VlnUnlockButton({ chapterId, lang, remaining, initialUnlocked }: VlnUnlockButtonProps) {
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (unlocked) {
    // conserva el idioma si se venía leyendo una traducción
    const readHref = lang ? `/leer/${chapterId}?lang=${lang}` : `/leer/${chapterId}`;
    return (
      <Button asChild size="sm">
        <Link href={readHref}>Leer capítulo</Link>
      </Button>
    );
  }

  const handleUnlock = async () => {
    setIsPending(true);
    setError(null);

    const result = await unlockChapter(chapterId);
    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setUnlocked(true);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleUnlock} disabled={isPending || remaining <= 0}>
        {isPending ? "Desbloqueando..." : `Desbloquear (quedan ${remaining})`}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
