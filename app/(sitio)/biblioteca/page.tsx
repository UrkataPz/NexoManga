import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGenres, getAvailableLanguages } from "@/lib/works_queries";
import { getLibraryWorks } from "@/lib/library_queries";
import { LIBRARY_TAGS, LIBRARY_TAG_LABELS } from "@/features/library/library-tags";
import { WorkFilters } from "@/components/WorkFilters/work-filters";
import { WorkCard } from "@/components/WorkCarousel/work-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BibliotecaPageProps {
  searchParams: Promise<{
    query?: string;
    type?: string;
    status?: string;
    genreId?: string;
    language?: string;
    sort?: string;
  }>;
}

export default async function BibliotecaPage({ searchParams }: BibliotecaPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="underline">
          Inicia sesión
        </Link>{" "}
        para ver tu biblioteca.
      </div>
    );
  }

  const [libraryWorks, genres, languages] = await Promise.all([
    getLibraryWorks(userId, params),
    getGenres(),
    getAvailableLanguages(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Biblioteca</h1>

      <WorkFilters
        action="/biblioteca"
        genres={genres}
        languages={languages}
        defaultValues={params}
      />

      <Tabs defaultValue={LIBRARY_TAGS[0]}>
        <TabsList>
          {LIBRARY_TAGS.map((tag) => (
            <TabsTrigger key={tag} value={tag}>
              {LIBRARY_TAG_LABELS[tag]} ({libraryWorks[tag].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {LIBRARY_TAGS.map((tag) => (
          <TabsContent key={tag} value={tag}>
            {libraryWorks[tag].length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No tienes obras en &quot;{LIBRARY_TAG_LABELS[tag]}&quot;.
              </p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {libraryWorks[tag].map((work) => (
                  <WorkCard key={work.id} work={work} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
