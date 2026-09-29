"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setMemberShares } from "@/features/translations/group-actions";
import type { GroupMember } from "@/lib/translations_queries";

interface MemberSharesProps {
  groupId: string;
  members: GroupMember[];
  shares: Record<string, number>;
  isLeader: boolean;
}

// tarjetas con el porcentaje de cada miembro; el líder desbloquea las cajas, cambia y guarda
export function MemberShares({ groupId, members, shares, isLeader }: MemberSharesProps) {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((member) => [member.userId, String(shares[member.userId] ?? 0)])),
  );

  const others = members.filter((member) => member.role !== "leader");
  const toNumber = (userId: string) => Math.round(Number(values[userId]) || 0);
  // al líder le toca lo que no se asignó a los demás
  const leaderShare = 100 - others.reduce((total, member) => total + toNumber(member.userId), 0);

  // guarda los porcentajes y vuelve a bloquear las cajas
  const handleSave = async () => {
    setIsSaving(true);
    const result = await setMemberShares(
      groupId,
      others.map((member) => member.userId),
      others.map((member) => toNumber(member.userId)),
    );
    setIsSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Porcentajes guardados.");
    setIsUnlocked(false);
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="font-semibold">Reparto del grupo</h3>
        <p className="text-sm text-muted-foreground">
          Lo que le toca a cada miembro de lo que gana el grupo. Lo que no se asigna es del líder. Solo lo ven los
          miembros.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <div key={member.userId} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Avatar imageUrl={member.avatarUrl} name={member.username} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{member.username}</span>
            {member.role === "leader" ? (
              <span className={leaderShare < 0 ? "font-semibold text-red-500" : "font-semibold"}>{leaderShare} %</span>
            ) : isUnlocked ? (
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={values[member.userId] ?? "0"}
                onChange={(event) => setValues({ ...values, [member.userId]: event.target.value })}
                className="w-20"
              />
            ) : (
              <span className="font-semibold">{toNumber(member.userId)} %</span>
            )}
          </div>
        ))}
      </div>

      {isLeader && (
        <div className="flex gap-2">
          <Button variant="outline" disabled={isUnlocked} onClick={() => setIsUnlocked(true)}>
            Editar porcentajes
          </Button>
          <Button disabled={!isUnlocked || isSaving} onClick={handleSave}>
            Guardar
          </Button>
        </div>
      )}
    </section>
  );
}
