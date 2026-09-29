import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGroupDetail, getGroupInvites, getGroupShares, getMyGroup, getMyInvites } from "@/lib/translations_queries";
import { GroupView } from "@/components/Translations/group-view";
import { MyInvites } from "@/components/Translations/my-invites";

// Mi Grupo (traductor): el mismo detalle que la página pública del grupo, o sus invitaciones
export default async function MiGrupoPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const myGroup = await getMyGroup(userId);

  if (!myGroup) {
    const invites = await getMyInvites(userId);
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-bold">Mi Grupo</h1>
        <MyInvites invites={invites} />
        <p className="text-sm text-muted-foreground">
          No perteneces a ningún grupo. Crea uno en{" "}
          <Link href="/comunidad/traducir" className="underline">
            Comunidad › Traducir
          </Link>{" "}
          o espera a que un líder te invite.
        </p>
      </div>
    );
  }

  const [group, shares, invites] = await Promise.all([
    getGroupDetail(myGroup.id),
    getGroupShares(myGroup.id),
    getGroupInvites(myGroup.id),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Mi Grupo</h1>
      {group && <GroupView group={group} currentUserId={userId} shares={shares} invites={invites} />}
    </div>
  );
}
