"use client";

import { createClient } from "@/lib/supabase/client";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutMenuItem() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
      <LogOut size={16} />
      Cerrar sesión
    </DropdownMenuItem>
  );
}