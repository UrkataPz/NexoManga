"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInvite, deleteInvite } from "@/features/translations/group-actions";
import type { MyInvite } from "@/lib/translations_queries";

interface MyInvitesProps {
  invites: MyInvite[];
}

// invitaciones que recibió el usuario, con Aceptar y Rechazar
export function MyInvites({ invites }: MyInvitesProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  if (invites.length === 0) return null;

  // acepta y abre la página del grupo
  const handleAccept = async (inviteId: string) => {
    setIsPending(true);
    const result = await acceptInvite(inviteId);
    setIsPending(false);

    if (result.error !== undefined) {
      toast.error(result.error);
      return;
    }
    toast.success("¡Ya eres parte del grupo!");
    router.push(`/comunidad/traducir/grupos/${result.groupId}`);
  };

  // rechaza la invitación
  const handleReject = async (inviteId: string) => {
    setIsPending(true);
    const result = await deleteInvite(inviteId);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invitación rechazada.");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Te invitaron a:</h3>
      <ul className="flex flex-col gap-2">
        {invites.map((invite) => (
          <li key={invite.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{invite.groupName}</span>
            <Button size="sm" disabled={isPending} onClick={() => handleAccept(invite.id)}>
              Aceptar
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleReject(invite.id)}>
              Rechazar
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
