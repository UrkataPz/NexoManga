"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberShares } from "@/components/Translations/member-shares";
import { GroupInvites } from "@/components/Translations/group-invites";
import { EditGroupForm } from "@/components/Translations/edit-group-form";
import { leaveGroup, removeMember } from "@/features/translations/group-actions";
import type { GroupDetail, GroupInvite } from "@/lib/translations_queries";

interface GroupViewProps {
  group: Omit<GroupDetail, "works">;
  currentUserId: string | null;
  // porcentajes (solo llegan si quien mira es miembro)
  shares: Record<string, number>;
  // invitaciones pendientes (solo llegan si quien mira es el líder)
  invites: GroupInvite[];
}

// detalle de un grupo: miembros y Salir / Quitar; los miembros ven el reparto y el líder sus herramientas
export function GroupView({ group, currentUserId, shares, invites }: GroupViewProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const me = group.members.find((member) => member.userId === currentUserId);
  const isLeader = me?.role === "leader";

  // corre una acción del grupo, muestra el resultado y recarga
  const run = async (action: () => Promise<{ error?: string }>, successMessage: string) => {
    setIsPending(true);
    const result = await action();
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(successMessage);
    router.refresh();
  };

  // salir del grupo (pide confirmación)
  const handleLeave = () => {
    if (window.confirm("¿Salir del grupo?")) run(leaveGroup, "Saliste del grupo.");
  };

  // el líder quita a un miembro (pide confirmación)
  const handleRemove = (memberId: string, username: string) => {
    if (window.confirm(`¿Quitar a ${username} del grupo?`)) {
      run(() => removeMember(memberId), `${username} ya no está en el grupo.`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar imageUrl={null} name={group.name} className="h-14 w-14 text-xl" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{group.name}</h2>
            {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
          </div>

          {me && (
            <Button variant="outline" disabled={isPending} onClick={handleLeave}>
              Salir del grupo
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            Miembros ({group.members.length}/{group.maxMembers})
          </h3>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {group.members.map((member) => (
              <li key={member.userId} className="flex items-center gap-3 px-4 py-2">
                <Link href={`/comunidad/autor/${member.userId}`} className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar imageUrl={member.avatarUrl} name={member.username} />
                  <span className="truncate text-sm font-medium hover:underline">{member.username}</span>
                </Link>
                {member.role === "leader" && <Badge className="bg-brand text-white hover:bg-brand">Líder</Badge>}
                {isLeader && member.userId !== currentUserId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleRemove(member.userId, member.username)}
                  >
                    Quitar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {me && <MemberShares groupId={group.id} members={group.members} shares={shares} isLeader={isLeader} />}
      {isLeader && <GroupInvites groupId={group.id} invites={invites} />}
      {isLeader && <EditGroupForm group={group} />}
    </div>
  );
}
