"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { acceptApplication } from "@/features/translations/author-actions";
import { APPLICATION_STATUS_LABELS } from "@/features/translations/translation-options";
import type { JobApplication } from "@/lib/translations_queries";

interface ApplicantsListProps {
  jobId: string;
  applications: JobApplication[];
  // solo se puede elegir mientras el trabajo está abierto
  canAccept: boolean;
}

// postulantes de un trabajo, con el botón para elegir a uno
export function ApplicantsList({ jobId, applications, canAccept }: ApplicantsListProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  // elige al postulante (los demás quedan como "no elegida") y recarga
  const handleAccept = async (applicationId: string, name: string) => {
    if (!window.confirm(`¿Elegir a ${name} para esta traducción?`)) return;
    setIsPending(true);
    const result = await acceptApplication(jobId, applicationId);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`${name} ya tiene el trabajo asignado.`);
    router.refresh();
  };

  if (applications.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía nadie se postuló.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
      {applications.map((application) => (
        <li key={application.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{application.translatorName}</p>
            <p className="text-xs text-muted-foreground">
              {application.groupName ? `Grupo ${application.groupName}` : "Traductor individual"}
            </p>
          </div>
          {canAccept && application.status === "pending" ? (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => handleAccept(application.id, application.translatorName)}
            >
              Aceptar
            </Button>
          ) : (
            <Badge variant={application.status === "accepted" ? "default" : "secondary"}>
              {APPLICATION_STATUS_LABELS[application.status]}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
