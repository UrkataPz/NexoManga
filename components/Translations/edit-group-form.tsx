"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateGroup } from "@/features/translations/group-actions";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_MAX_MEMBERS,
  GROUP_MIN_MEMBERS,
  GROUP_NAME_MAX,
} from "@/features/translations/translation-options";

interface EditGroupFormProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    maxMembers: number;
  };
}

// el líder modifica el nombre, la descripción y el cupo del grupo
export function EditGroupForm({ group }: EditGroupFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // guarda los cambios y recarga la página
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    const result = await updateGroup(group.id, new FormData(event.currentTarget));
    setIsSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Cambios guardados.");
    router.refresh();
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-semibold">Datos del grupo</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid gap-2">
          <Label htmlFor="groupName">Nombre</Label>
          <Input id="groupName" name="name" required maxLength={GROUP_NAME_MAX} defaultValue={group.name} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="groupDescription">Descripción</Label>
          <Textarea
            id="groupDescription"
            name="description"
            rows={3}
            maxLength={GROUP_DESCRIPTION_MAX}
            defaultValue={group.description ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="groupMaxMembers">Cupo (integrantes)</Label>
          <Input
            id="groupMaxMembers"
            name="maxMembers"
            type="number"
            required
            min={GROUP_MIN_MEMBERS}
            max={GROUP_MAX_MEMBERS}
            defaultValue={group.maxMembers}
            className="w-24"
          />
        </div>
        <Button type="submit" disabled={isSaving} className="self-start">
          Guardar cambios
        </Button>
      </form>
    </section>
  );
}
