import { createClient } from "@/lib/supabase/server";
import { getGroups, getMyAppliedJobIds, getMyGroup, getMyInvites, getOpenJobs } from "@/lib/translations_queries";
import { JobsBoard } from "@/components/Translations/jobs-board";
import { GroupsBox } from "@/components/Translations/groups-box";

// pestaña Traducir: trabajos abiertos a la izquierda y grupos a la derecha
export default async function TraducirPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub ?? null;

  const [jobs, groups, appliedJobIds, myGroup, invites] = await Promise.all([
    getOpenJobs(),
    getGroups(),
    userId ? getMyAppliedJobIds(userId) : Promise.resolve(new Set<string>()),
    userId ? getMyGroup(userId) : Promise.resolve(null),
    userId ? getMyInvites(userId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <section className="min-w-0 flex-1">
        <h2 className="mb-3 text-lg font-semibold">Trabajos de traducción</h2>
        <JobsBoard jobs={jobs} appliedJobIds={Array.from(appliedJobIds)} isLoggedIn={Boolean(userId)} />
      </section>

      <aside className="w-full lg:w-80 lg:shrink-0">
        <GroupsBox groups={groups} myGroup={myGroup} invites={invites} isLoggedIn={Boolean(userId)} />
      </aside>
    </div>
  );
}
