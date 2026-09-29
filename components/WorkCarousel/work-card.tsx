import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Work } from "@/lib/works_queries";

interface WorkCardProps {
  work: Work;
}

// tarjeta de una obra: portada, titulo, autor, idiomas
export function WorkCard({ work }: WorkCardProps) {
  return (
    <Link href={`/obra/${work.id}`} className="flex w-40 shrink-0 snap-start flex-col gap-1.5">
      <div className="h-60 w-40 overflow-hidden rounded-lg bg-muted">
        {work.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={work.coverUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <p className="truncate text-sm font-medium">{work.title}</p>
      <p className="truncate text-sm font-medium">{work.authorName}</p>

      {work.languages.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {work.languages.map((language) => (
            <Badge key={language} variant="secondary">
              {language}
            </Badge>
          ))}
        </div>
      )}
    </Link>
  );
}
