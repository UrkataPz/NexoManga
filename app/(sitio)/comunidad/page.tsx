import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCommunityPosts } from "@/lib/community_queries";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { canAccessPanel } from "@/features/panel/panel-options";
import { PostComposer } from "@/components/Community/post-composer";
import { PostCard } from "@/components/Community/post-card";

// pestaña Comunidad: caja para publicar + feed público con respuestas
export default async function ComunidadPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub ?? null;

  const [posts, profile] = await Promise.all([
    getCommunityPosts(),
    userId ? getCurrentUserProfile(userId) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {userId ? (
        // anunciar: los mismos roles que entran a Mi panel (autor o traductor)
        <PostComposer canAnnounce={canAccessPanel(profile?.roles ?? [])} />
      ) : (
        <p className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          <Link href="/auth/login" className="underline">
            Inicia sesión
          </Link>{" "}
          para publicar.
        </p>
      )}

      {posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay publicaciones. ¡Sé el primero!
        </p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} currentUserId={userId} />)
      )}
    </div>
  );
}
