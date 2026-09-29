"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PostComposer } from "@/components/Community/post-composer";
import { deletePost } from "@/features/community/community-actions";
import { getCommunityRoleLabel } from "@/features/community/community-options";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "@/lib/community_queries";

interface PostCardProps {
  post: CommunityPost;
  currentUserId: string | null;
}

// autor, fecha, texto e imagen de un post (se usa para el post y para sus respuestas)
function PostBody({ post, onDelete }: { post: CommunityPost; onDelete?: () => void }) {
  return (
    <div className="flex gap-3">
      <Link href={`/comunidad/autor/${post.authorId}`} className="shrink-0">
        <Avatar imageUrl={post.authorAvatarUrl} name={post.authorName} className="h-9 w-9" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/comunidad/autor/${post.authorId}`} className="text-sm font-semibold hover:underline">
            {post.authorName}
          </Link>
          <span className="text-xs text-muted-foreground">
            {getCommunityRoleLabel(post.authorRoles)} · {post.dateLabel}
          </span>
          {post.isAnnouncement && <Badge className="bg-brand text-white hover:bg-brand">Anuncio</Badge>}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Eliminar"
              className="ml-auto text-muted-foreground hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{post.content}</p>
        {post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt="" className="mt-2 max-h-96 rounded-md border border-border object-contain" />
        )}
      </div>
    </div>
  );
}

// un post del feed con sus respuestas, el botón de responder y el de eliminar (si es tuyo)
export function PostCard({ post, currentUserId }: PostCardProps) {
  const router = useRouter();
  const [showReplies, setShowReplies] = useState(false);

  // pide confirmación, borra el post y recarga el feed
  const handleDelete = async (postId: string) => {
    if (!window.confirm("¿Eliminar esta publicación?")) return;
    const result = await deletePost(postId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        // el anuncio: borde rosa y un degradado rosa suave encima del gris
        post.isAnnouncement && "border-brand/60 bg-gradient-to-br from-brand/10 to-transparent",
      )}
    >
      <PostBody post={post} onDelete={post.authorId === currentUserId ? () => handleDelete(post.id) : undefined} />

      <button
        type="button"
        onClick={() => setShowReplies(!showReplies)}
        className="mt-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <MessageCircle size={14} />
        {post.replies.length} {post.replies.length === 1 ? "respuesta" : "respuestas"}
      </button>

      {showReplies && (
        <div className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-4">
          {post.replies.map((reply) => (
            <PostBody
              key={reply.id}
              post={reply}
              onDelete={reply.authorId === currentUserId ? () => handleDelete(reply.id) : undefined}
            />
          ))}
          {currentUserId ? (
            <PostComposer canAnnounce={false} parentPostId={post.id} />
          ) : (
            <p className="text-xs text-muted-foreground">Inicia sesión para responder.</p>
          )}
        </div>
      )}
    </article>
  );
}
