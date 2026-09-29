import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkDetail, getWorkComments, getWorkChapters, isWorkAuthor } from "@/lib/works_queries";
import { getMyLibraryTag } from "@/lib/library_queries";
import { getCurrentUserProfile } from "@/lib/users_queries";
import { getCurrentPlan } from "@/lib/subscriptions_queries";
import { getVlnRemainingToday, getUnlockedChapterIds } from "@/lib/vln_queries";
import { getMyReadChapterIds, getTranslatedChapterIds } from "@/lib/reader_queries";
import { WorkDetailHeader } from "@/components/WorkDetail/work-detail-header";
import { LibraryTagSelector } from "@/components/LibraryTagSelector/library-tag-selector";
import { WorkComments } from "@/components/WorkComments/work-comments";
import { ChaptersList } from "@/components/ChaptersList/chapters-list";
import { ActionButton } from "@/components/ActionButton/action-button";
import { Button } from "@/components/ui/button";
import { reportWork } from "@/features/reports/report-content";

interface ObraPageProps {
  params: Promise<{ id: string }>;
}

export default async function ObraPage({ params }: ObraPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [work, comments, chapters, { data: authData }] = await Promise.all([  //obtenemos los datos de la obra
    getWorkDetail(id),
    getWorkComments(id),
    getWorkChapters(id),
    supabase.auth.getClaims(),
  ]);

  if (!work) {
    notFound();
  }

  const userId = authData?.claims?.sub ?? null;

  const chapterIds = chapters.map((chapter) => chapter.id);

  const [initialTag, profile, plan, vlnRemaining, unlockedChapterIds, isAuthorViewer, readChapterIds, translatedChapterIds] = await Promise.all([
    userId ? getMyLibraryTag(userId, id) : Promise.resolve(null),
    userId ? getCurrentUserProfile(userId) : Promise.resolve(null),
    getCurrentPlan(),
    userId ? getVlnRemainingToday(userId) : Promise.resolve(0),
    userId ? getUnlockedChapterIds(userId, chapterIds) : Promise.resolve(new Set<string>()),
    userId ? isWorkAuthor(userId, id) : Promise.resolve(false),
    userId ? getMyReadChapterIds(userId, chapterIds) : Promise.resolve(new Set<string>()),
    userId ? getTranslatedChapterIds(userId, chapterIds) : Promise.resolve(new Set<string>()),
  ]);

  const currentUser = profile
    ? { username: profile.username, avatarUrl: profile.profileImageUrl }
    : null;
  const isAdminViewer = profile?.roles.includes("admin") === true;
  // el admin lee todo gratis: en la lista se le trata como Premium (sin candados VLN)
  const isPremiumViewer = plan !== "free" || isAdminViewer;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6">
      <WorkDetailHeader work={work} />

      {isAuthorViewer && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/mi-panel/publicar/modificar-obra/${id}`}>Modificar obra</Link>
        </Button>
      )}

      {userId && !isAuthorViewer && !isAdminViewer && (
        <ActionButton
          action={reportWork.bind(null, id)}
          label="Reportar obra"
          reasonText="¿Por qué reportas esta obra?"
          successText="Reporte enviado. El administrador lo va a revisar."
          variant="outline"
        />
      )}

      <LibraryTagSelector workId={id} isLoggedIn={Boolean(userId)} initialTag={initialTag} />

      <WorkComments workId={id} comments={comments} currentUser={currentUser} />

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Capítulos ({chapters.length})
        </h2>
        <ChaptersList
          chapters={chapters}
          isLoggedIn={Boolean(userId)}
          isPremiumViewer={isPremiumViewer}
          isAuthorViewer={isAuthorViewer}
          vlnRemaining={vlnRemaining}
          unlockedChapterIds={unlockedChapterIds}
          readChapterIds={readChapterIds}
          translatedChapterIds={translatedChapterIds}
        />
      </section>

    </div>
  );
}