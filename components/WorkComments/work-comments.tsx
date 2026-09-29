"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar } from "../ui/avatar"
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { postComment } from "@/features/comments/post-comment"
import { WorkComment } from "@/lib/works_queries"

const PAGE_SIZE = 3;

interface CurrentUser{
    username: string;
    avatarUrl: string | null;
}

interface WorkCommentsProps {
    workId: string;
    comments: WorkComment[];
    currentUser: CurrentUser | null;
}

export function WorkComments({workId, comments: initialComments, currentUser}: WorkCommentsProps)  {
    const [comments, setComments] = useState(initialComments);
    const [visible, setVisible] = useState(PAGE_SIZE);
    const [text, setText] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const shown = comments.slice(0, visible);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!text.trim()) return;
        setIsPosting(true);
        setError(null);

        const result = await postComment(workId, text);
        setIsPosting(false);

        if (!result.comment) {
        setError(result.error ?? "No se pudo publicar el comentario.");
        return;
        }

        const { comment } = result;
        setComments((current) => [comment, ...current]);
        setVisible((current) => current + 1);
        setText("");
    }; 

    return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight">
        Comentarios ({comments.length})
      </h2>

      {currentUser ? (
        <form onSubmit={handleSubmit} className="mb-5 flex gap-3 rounded-lg border border-border bg-card p-3">
          <Avatar imageUrl={currentUser.avatarUrl} name={currentUser.username} className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Escribe un comentario..."
              rows={2}
              maxLength={2000}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="mt-1 flex justify-end">
              <Button type="submit" size="sm" disabled={isPosting || !text.trim()}>
                {isPosting ? "Publicando..." : "Publicar"}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mb-5 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          <Link href="/auth/login" className="underline">
            Inicia sesión
          </Link>{" "}
          para comentar.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sé el primero en comentar esta obra.</p>
      ) : (
        <ul className="space-y-4">
          {shown.map((comment) => (
            <li key={comment.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
              <Avatar imageUrl={comment.avatarUrl} name={comment.username} className="h-8 w-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{comment.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString("es", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90">{comment.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {visible < comments.length && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setVisible((value) => value + PAGE_SIZE)}
        >
          Ver más comentarios
        </Button>
      )}
    </section>
  );
    
}