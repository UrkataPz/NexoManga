import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getFollowerCount,
  getPublicProfile,
  getTranslatedWorks,
  isFollowing,
} from "@/lib/community_queries";
import { getCommunityRoleLabel } from "@/features/community/community-options";
import { ProfileDisplay } from "@/components/Profile/profile-display";
import { AuthorWorksSection } from "@/components/Profile/author-works-section";
import { FollowButton } from "@/components/Community/follow-button";
import { WorkCard } from "@/components/WorkCarousel/work-card";
import { ActionButton } from "@/components/ActionButton/action-button";
import { Badge } from "@/components/ui/badge";
import { reportUser } from "@/features/reports/report-content";

interface AutorPageProps {
  params: Promise<{ id: string }>;
}

// perfil público: datos, seguidores, botón seguir, sus obras y sus traducciones
export default async function AutorPage({ params }: AutorPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub ?? null;

  const profile = await getPublicProfile(id);
  if (!profile) {
    notFound();
  }

  const isAuthor = profile.roles.includes("author");
  const isTranslator = profile.roles.includes("translator");
  const isOwnProfile = userId === profile.id;

  const [followerCount, following, translatedWorks] = await Promise.all([
    getFollowerCount(profile.id),
    userId && !isOwnProfile ? isFollowing(userId, profile.id) : Promise.resolve(false),
    isTranslator ? getTranslatedWorks(profile.id) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/comunidad/descubre"
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Volver a Descubre
      </Link>

      <ProfileDisplay
        username={profile.username}
        bio={profile.bio}
        avatarUrl={profile.avatarUrl}
        bannerUrl={profile.bannerUrl}
      >
        <div className="flex flex-col items-center gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{getCommunityRoleLabel(profile.roles)}</Badge>
            <span className="text-sm text-muted-foreground">{followerCount} seguidores</span>
          </div>
          {(isAuthor || isTranslator) && !isOwnProfile && (
            <FollowButton authorId={profile.id} isLoggedIn={Boolean(userId)} initialFollowing={following} />
          )}
          {userId && !isOwnProfile && (
            <ActionButton
              action={reportUser.bind(null, profile.id)}
              label="Reportar"
              reasonText="¿Por qué reportas a este usuario?"
              successText="Reporte enviado. El administrador lo va a revisar."
              variant="outline"
            />
          )}
        </div>
      </ProfileDisplay>

      {isAuthor && <AuthorWorksSection userId={profile.id} />}

      {isTranslator && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Traducciones</h2>
          {translatedWorks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no tiene traducciones publicadas.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {translatedWorks.map((work) => (
                <WorkCard key={work.id} work={work} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
