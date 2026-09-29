import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHAPTER_STATE_LABELS } from "@/features/chapters/chapter-options";
import type { MyChapter } from "@/lib/panel_queries";

interface MyChaptersListProps {
  chapters: MyChapter[];
  actionLabel: string;
  emptyText: string;
}

// capítulos del autor agrupados por obra, cada uno con un botón para abrirlo en Modificar capítulo
export function MyChaptersList({ chapters, actionLabel, emptyText }: MyChaptersListProps) {
  if (chapters.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  const byWork = new Map<string, { title: string; chapters: MyChapter[] }>();
  for (const chapter of chapters) {
    const group = byWork.get(chapter.workId) ?? { title: chapter.workTitle, chapters: [] };
    group.chapters.push(chapter);
    byWork.set(chapter.workId, group);
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(byWork, ([workId, group]) => (
        <section key={workId} className="flex flex-col gap-2">
          <h2 className="font-semibold">{group.title}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {group.chapters.map((chapter) => (
              <li key={chapter.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    Capítulo {chapter.number}
                    {chapter.title ? ` — ${chapter.title}` : ""}
                  </span>
                  <Badge variant={chapter.state === "draft" ? "outline" : "secondary"}>
                    {CHAPTER_STATE_LABELS[chapter.state]}
                  </Badge>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/mi-panel/publicar/modificar-capitulo/${chapter.id}`}>
                    {actionLabel}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
