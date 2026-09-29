import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VlnUnlockButton } from "@/components/ChaptersList/vln-unlock-button";
import type { Chapter } from "@/lib/works_queries";

interface ChaptersListProps {
  chapters: Chapter[];
  isLoggedIn: boolean;
  isPremiumViewer: boolean;
  isAuthorViewer: boolean;
  vlnRemaining: number;
  unlockedChapterIds: Set<string>;
  readChapterIds: Set<string>;
  translatedChapterIds: Set<string>;
}

export function ChaptersList({
  chapters,
  isLoggedIn,
  isPremiumViewer,
  isAuthorViewer,
  vlnRemaining,
  unlockedChapterIds,
  readChapterIds,
  translatedChapterIds,
}: ChaptersListProps) {
  if (chapters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta obra todavía no tiene capítulos publicados.
      </p>
    );
  }

  return (
    <Accordion type="multiple" className="rounded-lg border border-border bg-card px-3">
      {chapters.map((chapter) => {
        // si es autor de la obra, o tradujo el capítulo (él o su grupo), puede leer
        const vlnAppliesToViewer =
          chapter.isVln && !isPremiumViewer && !isAuthorViewer && !translatedChapterIds.has(chapter.id);
        // capitulo aun bloqueado
        const isLocked = vlnAppliesToViewer && !unlockedChapterIds.has(chapter.id);
        // Etiqueta informatica para indicar al autor si usa VLN o no
        const showVlnBadge = chapter.isVln && (isAuthorViewer || !isPremiumViewer);
        // Etiqueta informatica para el autor para indicar que el capitulo lo configuró como programado
        const isScheduled =
          chapter.publicationDate !== null && new Date(chapter.publicationDate) > new Date();

        return (
          <AccordionItem key={chapter.id} value={chapter.id}>
            <AccordionTrigger>
              <div className="flex flex-1 flex-wrap items-center gap-2 pr-2">
                {readChapterIds.has(chapter.id) && (
                  <CheckCircle2 size={16} className="shrink-0 text-green-600" aria-label="Leído" />
                )}
                <span className="flex-1 text-left">
                  Capítulo {chapter.number}
                  {chapter.title ? ` — ${chapter.title}` : ""}
                </span>
                {chapter.languages.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {chapter.languages.map((language) => language.toUpperCase()).join(" · ")}
                  </span>
                )}
                {showVlnBadge && <Badge variant="outline">VLN</Badge>}
                {chapter.isPremium && <Badge variant="secondary">Premium</Badge>}
                {isScheduled && <Badge variant="outline">Programado</Badge>}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {chapter.publicationDate
                    ? new Date(chapter.publicationDate).toLocaleDateString("es", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Sin fecha de publicación"}
                </p>

                {isAuthorViewer && (
                  <Link
                    href={`/mi-panel/publicar/modificar-capitulo/${chapter.id}`}
                    className="ml-auto text-sm text-muted-foreground underline"
                  >
                    Modificar
                  </Link>
                )}

                {isLocked && !isLoggedIn ? (
                  <Link href="/auth/login" className="text-sm underline">
                    Inicia sesión para desbloquear
                  </Link>
                ) : isLocked ? (
                  <VlnUnlockButton chapterId={chapter.id} remaining={vlnRemaining} initialUnlocked={false} />
                ) : (
                  // un botón por idioma, el original abre /leer/[id] y las traducciones ?lang=xx
                  <div className="flex flex-wrap gap-2">
                    {chapter.languages.map((language, index) => (
                      <Button key={language} asChild size="sm" variant={index === 0 ? "default" : "outline"}>
                        <Link href={index === 0 ? `/leer/${chapter.id}` : `/leer/${chapter.id}?lang=${language}`}>
                          Leer {language.toUpperCase()}
                        </Link>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
