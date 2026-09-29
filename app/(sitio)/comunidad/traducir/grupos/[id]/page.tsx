import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGroupDetail, getGroupInvites, getGroupShares } from "@/lib/translations_queries";
import { GroupView } from "@/components/Translations/group-view";
import { WorkCard } from "@/components/WorkCarousel/work-card";

interface GrupoPageProps {
  params: Promise<{ id: string }>;
}

// página pública de un grupo de traducción (miembros y líder ven más cosas)
export default async function GrupoPage({ params }: GrupoPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub ?? null;

  // la BD solo da porcentajes a los miembros e invitaciones al líder
  const [group, shares, invites] = await Promise.all([
    getGroupDetail(id),
    userId ? getGroupShares(id) : Promise.resolve({}),
    userId ? getGroupInvites(id) : Promise.resolve([]),
  ]);

  if (!group) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/comunidad/traducir"
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Volver a Traducir
      </Link>

      <GroupView group={group} currentUserId={userId} shares={shares} invites={invites} />

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Obras que tradujo</h2>
        {group.works.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no tiene traducciones publicadas.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {group.works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
