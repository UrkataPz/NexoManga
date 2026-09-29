"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveTranslation, requestRevision } from "@/features/translations/author-actions";

// botones del autor para una traducción enviada: aprobar o pedir corrección con una nota
export function ReviewActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, setIsPending] = useState(false);

  // aprueba: la traducción queda publicada para los lectores
  const handleApprove = async () => {
    if (!window.confirm("¿Aprobar y publicar esta traducción?")) return;
    setIsPending(true);
    const result = await approveTranslation(jobId);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Traducción publicada.");
    router.refresh();
  };

  // la devuelve al traductor con la nota de lo que debe corregir
  const handleRevision = async () => {
    setIsPending(true);
    const result = await requestRevision(jobId, note);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Le avisamos al traductor qué corregir.");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <Button onClick={handleApprove} disabled={isPending} className="self-start">
        Aprobar y publicar
      </Button>
      <div className="flex flex-col gap-2">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="¿Algo que corregir? Escríbelo aquí (por ejemplo: la página 3 tiene un error en el globo 2)."
        />
        <Button variant="outline" onClick={handleRevision} disabled={isPending || !note.trim()} className="self-start">
          Pedir corrección
        </Button>
      </div>
    </div>
  );
}
