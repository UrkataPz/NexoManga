"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createAnnouncement } from "@/features/admin/admin-actions";

// formulario para publicar un anuncio oficial
export function AnnouncementForm() {
  const router = useRouter();
  const [isPosting, setIsPosting] = useState(false);

  // manda el anuncio, limpia el formulario y recarga la lista
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setIsPosting(true);

    const result = await createAnnouncement(new FormData(form));
    setIsPosting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Anuncio publicado.");
    form.reset();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <Input name="title" required maxLength={120} placeholder="Título del anuncio" />
      <Textarea name="content" required rows={4} placeholder="¿Qué quieres anunciar?" />
      <Button type="submit" size="sm" disabled={isPosting} className="self-start">
        {isPosting ? "Publicando..." : "Publicar anuncio"}
      </Button>
    </form>
  );
}
