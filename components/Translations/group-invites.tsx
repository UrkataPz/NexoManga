"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteInvite, inviteMember } from "@/features/translations/group-actions";
import type { GroupInvite } from "@/lib/translations_queries";

interface GroupInvitesProps {
  groupId: string;
  invites: GroupInvite[];
}

// el líder invita por nombre de usuario y ve las invitaciones que siguen pendientes
export function GroupInvites({ groupId, invites }: GroupInvitesProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  // manda la invitación y limpia la caja
  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setIsPending(true);
    const result = await inviteMember(groupId, new FormData(form));
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invitación enviada.");
    form.reset();
    router.refresh();
  };

  // cancela una invitación pendiente
  const handleCancel = async (inviteId: string) => {
    setIsPending(true);
    const result = await deleteInvite(inviteId);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invitación cancelada.");
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">Invitar miembros</h3>

      <form onSubmit={handleInvite} className="flex gap-2">
        <Input name="username" required placeholder="Nombre de usuario" />
        <Button type="submit" disabled={isPending}>
          Invitar
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">Invitaciones pendientes</h4>
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{invite.username}</span>
                <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleCancel(invite.id)}>
                  Cancelar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
