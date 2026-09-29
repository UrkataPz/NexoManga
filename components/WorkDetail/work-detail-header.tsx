import { Badge } from "@/components/ui/badge";
import type { WorkDetail } from "@/lib/works_queries";

export function WorkDetailHeader({ work }: { work: WorkDetail }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-6">
        <div className="h-60 w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
          {work.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={work.coverUrl}
              alt={work.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {work.title}
            </h1>
            {work.alternativeTitles.length > 0 && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {work.alternativeTitles.join(" · ")}
              </p>
            )}
          </div>

          {work.synopsis && (
            <p className="text-sm leading-relaxed text-foreground/90">
              {work.synopsis}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{work.type}</Badge>
            <Badge variant="outline">{work.status}</Badge>
            {work.genres.map((genre) => (
              <Badge key={genre} variant="secondary">
                {genre}
              </Badge>
            ))}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Autor</dt>
              <dd>{work.authorName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Idiomas disponibles</dt>
              <dd>{work.languages.length > 0 ? work.languages.join(", ") : "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}