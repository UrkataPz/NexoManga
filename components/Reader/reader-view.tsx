"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useReadingTracker } from "@/components/Reader/use-reading-tracker";
import type { ChapterNavigation } from "@/lib/reader_queries";
import type { PageSize } from "@/features/reader/reader-rules";

interface ReaderViewProps {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string | null;
  workId: string;
  workTitle: string;
  pages: string[];
  language: string;
  translationId: string | null;
  pageSizes: PageSize[] | null;
  navigation: ChapterNavigation;
  metricsEnabled: boolean;
}

const arrowClass =
  "flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700 hover:bg-neutral-800";

// lector en cascada, nav fija arriba y las páginas una debajo de otra
export function ReaderView({
  chapterId,
  chapterNumber,
  chapterTitle,
  workId,
  workTitle,
  pages,
  language,
  translationId,
  pageSizes,
  navigation,
  metricsEnabled,
}: ReaderViewProps) {
  const router = useRouter();
  const pagesRef = useRef<HTMLDivElement>(null); //cuando se dibuja el componente apunta al div que contiene las paginas
  useReadingTracker(pagesRef, chapterId, translationId, metricsEnabled);
  // si se lee una traducción, anterior/siguiente intentan seguir en el mismo idioma
  const langQuery = translationId ? `?lang=${language}` : "";

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <nav className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-4">
        <Link href={`/obra/${workId}`} className="flex min-w-0 items-center gap-2 text-sm">
          <ArrowLeft size={18} className="shrink-0" />
          <span className="truncate">{workTitle}</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {/* idioma que se está leyendo */}
          <span className="rounded-md border border-neutral-700 px-2 py-1 text-xs font-semibold">
            {language.toUpperCase()}
          </span>
          {navigation.previousId ? (
            <Link href={`/leer/${navigation.previousId}${langQuery}`} className={arrowClass} aria-label="Capítulo anterior">
              <ChevronLeft size={16} />
            </Link>
          ) : (
            <span className={`${arrowClass} opacity-30`} aria-hidden="true">
              <ChevronLeft size={16} />
            </span>
          )}

          <select
            value={chapterId}
            onChange={(event) => router.push(`/leer/${event.target.value}${langQuery}`)}
            aria-label="Elegir capítulo"
            className="h-8 rounded-md border border-neutral-700 bg-neutral-900 px-2 text-sm"
          >
            {navigation.chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                Cap. {chapter.number}
              </option>
            ))}
          </select>

          {navigation.nextId ? (
            <Link href={`/leer/${navigation.nextId}${langQuery}`} className={arrowClass} aria-label="Capítulo siguiente">
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span className={`${arrowClass} opacity-30`} aria-hidden="true">
              <ChevronRight size={16} />
            </span>
          )}
        </div>
      </nav>

      <main className="mx-auto flex max-w-3xl flex-col pt-14">
        <h1 className="px-4 py-4 text-center text-sm text-neutral-400">
          Capítulo {chapterNumber}
          {chapterTitle ? ` — ${chapterTitle}` : ""}
        </h1>

        <div ref={pagesRef} className="flex flex-col">
          {pages.map((url, index) => { //index es la posicion de la pagina
            const size = pageSizes?.[index];
            return (
              <div key={index} data-page-number={index + 1}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Página ${index + 1}`}
                  width={size?.[0]}
                  height={size?.[1]}
                  loading={index < 2 ? "eager" : "lazy"}
                  className="block h-auto w-full"
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3 px-4 py-12">
          {navigation.nextId ? (
            <Link
              href={`/leer/${navigation.nextId}${langQuery}`}
              className="rounded-md bg-neutral-100 px-6 py-3 font-semibold text-neutral-900 hover:bg-white"
            >
              Siguiente capítulo
            </Link>
          ) : (
            <p className="text-sm text-neutral-400">Estás al día con esta obra.</p>
          )}
          <Link href={`/obra/${workId}`} className="text-sm text-neutral-400 underline">
            Volver a la obra
          </Link>
        </div>
      </main>
    </div>
  );
}
