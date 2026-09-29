import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getCommunityRoleLabel } from "@/features/community/community-options";
import type { CommunityMember } from "@/lib/community_queries";

// tarjeta de un autor o traductor en Descubre; lleva a su perfil público
export function MemberCard({ member }: { member: CommunityMember }) {
  return (
    <Link
      href={`/comunidad/autor/${member.id}`}
      className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-brand"
    >
      <Avatar imageUrl={member.avatarUrl} name={member.username} className="h-16 w-16 text-xl" />
      <span className="w-full truncate text-sm font-semibold">{member.username}</span>
      <Badge variant="secondary">{getCommunityRoleLabel(member.roles)}</Badge>
    </Link>
  );
}
