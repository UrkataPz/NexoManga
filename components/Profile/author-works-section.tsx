import { getWorksByAuthor } from "@/lib/works_queries";
import { WorkCard } from "@/components/WorkCarousel/work-card";

interface AuthorWorksSectionProps {
  userId: string;
}

// obras publicadas por el autor — se reutiliza en /perfil y en el perfil público de comunidad
export async function AuthorWorksSection({ userId }: AuthorWorksSectionProps) {
  const works = await getWorksByAuthor(userId);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-lg font-semibold">Obras</h2>
      {works.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no tiene obras publicadas.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </section>
  );
}
