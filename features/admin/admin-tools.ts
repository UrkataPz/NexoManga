import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/users_queries";



// devuelve el id del usuario solo si es admin; si no, null
export async function getAdminId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return null;

  const profile = await getCurrentUserProfile(userId);
  return profile?.roles.includes("admin") ? userId : null;
}

// anota una acción del admin en la bitácora
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  note: string | null,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("admin_action_logs").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    note,
  });

  if (error) console.error(error);
}
