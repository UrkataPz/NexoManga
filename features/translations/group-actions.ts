"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyGroup } from "@/lib/translations_queries";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_MAX_MEMBERS,
  GROUP_MIN_MEMBERS,
  GROUP_NAME_MAX,
} from "@/features/translations/translation-options";

type ActionResult = { error?: string };
type CreateGroupResult = { groupId: string; error?: undefined } | { error: string; groupId?: undefined };
type AcceptInviteResult = { groupId: string; error?: undefined } | { error: string; groupId?: undefined };
type GroupFields = { name: string; description: string | null; maxMembers: number };

// devuelve el id del usuario logueado, o null si no hay sesión
async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  return authData?.claims?.sub ?? null;
}

// lee y revisa nombre, descripción y cupo (lo usan crear y modificar)
function readGroupForm(formData: FormData): GroupFields | string {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const maxMembers = Number(formData.get("maxMembers"));

  if (name.length < 3 || name.length > GROUP_NAME_MAX) {
    return `El nombre debe tener entre 3 y ${GROUP_NAME_MAX} caracteres.`;
  }
  if (description.length > GROUP_DESCRIPTION_MAX) {
    return `La descripción no puede pasar de ${GROUP_DESCRIPTION_MAX} caracteres.`;
  }
  if (!Number.isInteger(maxMembers) || maxMembers < GROUP_MIN_MEMBERS || maxMembers > GROUP_MAX_MEMBERS) {
    return `El cupo debe ser de ${GROUP_MIN_MEMBERS} a ${GROUP_MAX_MEMBERS} integrantes.`;
  }
  return { name, description: description || null, maxMembers };
}

// crea un grupo; la BD pone al creador como líder (trigger add_group_creator_as_leader)
export async function createGroup(formData: FormData): Promise<CreateGroupResult> {
  const userId = await getUserId();
  if (!userId) return { error: "Inicia sesión para crear un grupo." };

  const fields = readGroupForm(formData);
  if (typeof fields === "string") return { error: fields };
  if (await getMyGroup(userId)) return { error: "Ya perteneces a un grupo." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("translation_groups")
    .insert({ name: fields.name, description: fields.description, max_members: fields.maxMembers, created_by: userId })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { groupId: data.id };
}

// el líder cambia nombre, descripción y cupo (la BD solo deja al líder)
export async function updateGroup(groupId: string, formData: FormData): Promise<ActionResult> {
  const fields = readGroupForm(formData);
  if (typeof fields === "string") return { error: fields };

  const supabase = await createClient();
  const { count } = await supabase
    .from("translation_group_members")
    .select("user_id", { count: "exact", head: true })
    .eq("group_id", groupId);
  if ((count ?? 0) > fields.maxMembers) return { error: `El grupo ya tiene ${count} miembros.` };

  const { error } = await supabase
    .from("translation_groups")
    .update({ name: fields.name, description: fields.description, max_members: fields.maxMembers })
    .eq("id", groupId);

  return error ? { error: error.message } : {};
}

// sale de su grupo; el líder solo puede salir si ya no queda nadie más
export async function leaveGroup(): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };

  const group = await getMyGroup(userId);
  if (!group) return { error: "No perteneces a ningún grupo." };

  const supabase = await createClient();
  if (group.role === "leader") {
    const { count } = await supabase
      .from("translation_group_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_id", group.id);
    if ((count ?? 0) > 1) return { error: "Eres el líder: primero quita a los demás miembros." };
  }

  const { error } = await supabase.from("translation_group_members").delete().eq("user_id", userId);
  return error ? { error: error.message } : {};
}

// el líder saca a un miembro de su grupo
export async function removeMember(memberId: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado." };

  const group = await getMyGroup(userId);
  if (group?.role !== "leader") return { error: "Solo el líder puede quitar miembros." };
  if (memberId === userId) return { error: "No puedes quitarte a ti mismo." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("translation_group_members")
    .delete()
    .eq("group_id", group.id)
    .eq("user_id", memberId);

  return error ? { error: error.message } : {};
}

// el líder invita a alguien por su nombre de usuario (la BD solo deja al líder)
export async function inviteMember(groupId: string, formData: FormData): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "").trim();
  if (!username) return { error: "Escribe un nombre de usuario." };

  const supabase = await createClient();
  const { data: invited } = await supabase.from("user_profiles").select("id").eq("username", username).maybeSingle();
  if (!invited) return { error: "No existe ese usuario." };
  if (await getMyGroup(invited.id)) return { error: "Ese usuario ya pertenece a un grupo." };

  const { error } = await supabase.from("translation_group_invites").insert({ group_id: groupId, user_id: invited.id });

  if (error?.code === "23505") return { error: "Ya invitaste a ese usuario." };
  return error ? { error: error.message } : {};
}

// acepta una invitación: la BD revisa el cupo y lo une al grupo con 0 %
export async function acceptInvite(inviteId: string): Promise<AcceptInviteResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("aceptar_invitacion", { p_invite_id: inviteId });

  if (error) return { error: error.message };
  return { groupId: data as string };
}

// borra una invitación: el invitado la rechaza o el líder la cancela
export async function deleteInvite(inviteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("translation_group_invites").delete().eq("id", inviteId);
  return error ? { error: error.message } : {};
}

// el líder guarda los porcentajes de todos los miembros de una vez
export async function setMemberShares(groupId: string, memberIds: string[], shares: number[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("guardar_porcentajes", {
    p_group_id: groupId,
    p_user_ids: memberIds,
    p_shares: shares,
  });

  if (error?.code === "23514") return { error: "Cada porcentaje debe estar entre 0 y 100." };
  return error ? { error: error.message } : {};
}
