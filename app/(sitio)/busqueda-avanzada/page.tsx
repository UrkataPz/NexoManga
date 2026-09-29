import { searchWorks, getGenres, getAvailableLanguages } from "@/lib/works_queries";
import { WorkFilters } from "@/components/WorkFilters/work-filters";
import { WorkCard } from "@/components/WorkCarousel/work-card";

interface BusquedaAvanzadaPageProps {
  searchParams: Promise<{
    query?: string;
    type?: string;
    status?: string;
    genreId?: string;
    language?: string;
    sort?: string;
  }>;
}

export default async function BusquedaAvanzadaPage({ searchParams }: BusquedaAvanzadaPageProps) {
  const params = await searchParams;

  const [works, genres, languages] = await Promise.all([
    searchWorks(params),
    getGenres(),
    getAvailableLanguages(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Búsqueda avanzada</h1>

      <WorkFilters
        action="/busqueda-avanzada"
        genres={genres}
        languages={languages}
        defaultValues={params}
      />

      {works.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No se encontraron obras con esos filtros.
        </p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </div>
  );
}
