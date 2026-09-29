"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/features/community/community-actions";

interface FollowButtonProps {
  authorId: string;
  isLoggedIn: boolean;
  initialFollowing: boolean;
}

// botón Seguir / Siguiendo del perfil público
export function FollowButton({ authorId, isLoggedIn, initialFollowing }: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, setIsPending] = useState(false);

  if (!isLoggedIn) {
    return (
      <Button asChild size="sm">
        <Link href="/auth/login">Seguir</Link>
      </Button>
    );
  }

  // sigue o deja de seguir y recarga para actualizar el contador de seguidores
  const handleClick = async () => {
    setIsPending(true);
    const result = await toggleFollow(authorId);
    setIsPending(false);

    if (result.error !== undefined) {
      toast.error(result.error);
      return;
    }
    setFollowing(result.following);
    router.refresh();
  };

  return (
    <Button size="sm" variant={following ? "outline" : "default"} onClick={handleClick} disabled={isPending}>
      {following ? "Siguiendo" : "Seguir"}
    </Button>
  );
}
