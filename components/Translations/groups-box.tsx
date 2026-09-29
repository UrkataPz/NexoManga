"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MyInvites } from "@/components/Translations/my-invites";
import { createGroup } from "@/features/translations/group-actions";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_MAX_MEMBERS,
  GROUP_MIN_MEMBERS,
  GROUP_NAME_MAX,
} from "@/features/translations/translation-options";
import type { GroupSummary, MyGroup, MyInvite } from "@/lib/translations_queries";

interface GroupsBoxProps {
  groups: GroupSummary[];
  myGroup: MyGroup | null;
  invites: MyInvite[];
  isLoggedIn: boolean;
}

// columna de grupos del tablero: mi grupo (o invitaciones y crear uno) y la lista de grupos
export function GroupsBox({ groups, myGroup, invites, isLoggedIn }: GroupsBoxProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // crea el grupo y abre su página
  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const result = await createGroup(new FormData(event.currentTarget));
    setIsPending(false);

    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    toast.success("¡Grupo creado! Eres su líder.");
    router.push(`/comunidad/traducir/grupos/${result.groupId}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Mi grupo</h2>
        {!isLoggedIn ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/auth/login" className="underline">
              Inicia sesión
            </Link>{" "}
            para crear un grupo o ver tus invitaciones.
          </p>
        ) : myGroup ? (
          <Link href={`/comunidad/traducir/grupos/${myGroup.id}`} className="flex items-center gap-2 hover:underline">
            <Avatar imageUrl={null} name={myGroup.name} />
            <span className="font-medium">{myGroup.name}</span>
            <span className="text-xs text-muted-foreground">{myGroup.role === "leader" ? "(líder)" : ""}</span>
          </Link>
        ) : (
          <div className="flex flex-col gap-4">
            <MyInvites invites={invites} />
            <form onSubmit={handleCreate} className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                No tienes grupo. Crea uno o espera a que un líder te invite.
              </p>
              <Input name="name" required maxLength={GROUP_NAME_MAX} placeholder="Nombre del grupo" />
              <Textarea name="description" rows={2} maxLength={GROUP_DESCRIPTION_MAX} placeholder="Descripción (opcional)" />
              <label className="flex items-center gap-2 text-sm">
                Cupo
                <Input
                  name="maxMembers"
                  type="number"
                  required
                  min={GROUP_MIN_MEMBERS}
                  max={GROUP_MAX_MEMBERS}
                  defaultValue={5}
                  className="w-20"
                />
                integrantes
              </label>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" size="sm" disabled={isPending} className="self-start">
                Crear grupo
              </Button>
            </form>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Grupos</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay grupos.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.map((group) => (
              <li key={group.id} className="flex items-center gap-2">
                <Link href={`/comunidad/traducir/grupos/${group.id}`} className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar imageUrl={null} name={group.name} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium hover:underline">{group.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {group.memberCount}/{group.maxMembers} miembros
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
