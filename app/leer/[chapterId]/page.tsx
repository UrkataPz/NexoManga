import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChapterForReader, getChapterNavigation, getChapterPages } from "@/lib/reader_queries";
import { getChapterAccess } from "@/features/reader/chapter-access";
import { ReaderView } from "@/components/Reader/reader-view";
import { VlnUnlockButton } from "@/components/ChaptersList/vln-unlock-button";

interface LeerPageProps {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<{ lang?: string }>;
}

// página del lector: decide si el usuario puede leer y muestra el capítulo o la pantalla de bloqueo
export default async function LeerPage({ params, searchParams }: LeerPageProps) {
  const { chapterId } = await params;
  const { lang } = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const chapter = await getChapterForReader(chapterId);
  if (!chapter) {
    notFound();
  }

  // el acceso siempre se decide sobre el capítulo original, aunque se lea una traducción
  const access = await getChapterAccess({
    userId,
    chapterId,
    workId: chapter.workId,
    isVln: chapter.isVln,
    isPremium: chapter.isPremium,
  });

  if (!access.allowed) {  //PANTALLA DE BLOQUEO QUE VERIFICA ACCESO AL CAPITULO
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-900 px-4 text-center text-neutral-100">
        {chapter.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chapter.coverUrl} alt="" className="h-60 w-40 rounded-lg object-cover" />
        )}
        <div>
          <p className="text-lg font-semibold">{chapter.workTitle}</p>
          <p className="text-sm text-neutral-400">Capítulo {chapter.number}</p>
        </div>

        {access.reason === "premium_required" ? (
          <p className="max-w-sm text-sm">Este capítulo es exclusivo para usuarios Premium.</p>
        ) : (
          <>
            <p className="max-w-sm text-sm">
              Este capítulo se lee con un desbloqueo VLN. Cada desbloqueo te da acceso por 72 horas.
            </p>
            <VlnUnlockButton chapterId={chapterId} lang={lang} remaining={access.remaining} initialUnlocked={false} />
          </>
        )}

        <Link href={`/obra/${chapter.workId}`} className="text-sm text-neutral-400 underline">
          Volver a la obra
        </Link>
      </div>
    );
  }

  const [pages, navigation] = await Promise.all([
    getChapterPages(chapter, lang ?? null),
    getChapterNavigation(chapter.workId, chapterId, chapter.number),
  ]);

  return (
    <ReaderView
      chapterId={chapterId}
      chapterNumber={chapter.number}
      chapterTitle={chapter.title}
      workId={chapter.workId}
      workTitle={chapter.workTitle}
      pages={pages.urls}
      language={pages.language}
      translationId={pages.translationId}
      pageSizes={chapter.pageSizes}
      navigation={navigation}
      metricsEnabled={access.reason !== "own_work"}
    />
  );
}
