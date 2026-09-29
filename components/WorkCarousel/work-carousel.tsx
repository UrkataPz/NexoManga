import type { Work } from "@/lib/works_queries";
import { WorkCard } from "@/components/WorkCarousel/work-card";

interface WorkCarouselProps {
    title: string;
    works: Work[];
}

export function WorkCarousel ({title, works}: WorkCarouselProps) {
    return(
        <section className="flex flex-col gap-3">

      <h2 className="text-lg font-bold">{title}</h2>

      {works.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay obras para mostrar todavía.
        </p>
      ) : (
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </section>
    );
}