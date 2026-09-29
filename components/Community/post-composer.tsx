"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createPost } from "@/features/community/community-actions";
import { POST_MAX_LENGTH } from "@/features/community/community-options";

interface PostComposerProps {
  canAnnounce: boolean;
  // si viene, lo que se escribe es una respuesta a ese post
  parentPostId?: string;
}

// caja para escribir un post (o una respuesta)
export function PostComposer({ canAnnounce, parentPostId }: PostComposerProps) {
  const router = useRouter();
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isReply = parentPostId !== undefined;

  // manda el post al servidor, limpia la caja y recarga el feed
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setIsPosting(true);
    setError(null);

    const result = await createPost(new FormData(form));
    setIsPosting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    form.reset();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      {isReply && <input type="hidden" name="parentPostId" value={parentPostId} />}

      <Textarea
        name="content"
        required
        maxLength={POST_MAX_LENGTH}
        rows={isReply ? 2 : 3}
        placeholder={isReply ? "Escribe una respuesta..." : "¿Qué quieres compartir con la comunidad?"}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isReply && (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImagePlus size={16} />
              <input type="file" name="image" accept="image/png,image/jpeg,image/webp" className="max-w-52 text-xs" />
            </label>
            {canAnnounce && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="announcement" className="accent-brand" />
                Publicar como anuncio (avisa a tus seguidores)
              </label>
            )}
          </div>
        )}

        <Button type="submit" size="sm" disabled={isPosting} className="ml-auto">
          {isPosting ? "Publicando..." : isReply ? "Responder" : "Publicar"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
