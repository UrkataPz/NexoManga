import { getCommunityMembers } from "@/lib/community_queries";
import { MemberCard } from "@/components/Community/member-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DescubrePageProps {
  searchParams: Promise<{ q?: string }>;
}

// pestaña Descubre: directorio de autores y traductores con buscador por nombre
export default async function DescubrePage({ searchParams }: DescubrePageProps) {
  const { q = "" } = await searchParams;
  const members = await getCommunityMembers(q.trim());

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Buscar autores o traductores..." />
        <Button type="submit">Buscar</Button>
      </form>

      {members.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No se encontraron autores ni traductores.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
