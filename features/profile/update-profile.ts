"use server";

import { createClient } from "@/lib/supabase/server";
import { convertToWebp, uploadWebp } from "@/lib/images";
import { getCurrentPlan } from "@/lib/subscriptions_queries";

type UpdateProfileResult = { error?: string };

// tamaño final de cada imagen del perfil (se recorta al guardar)
const PROFILE_IMAGES = {
  avatar: { width: 400, height: 400, column: "profile_image_url" },
  banner: { width: 1500, height: 500, column: "banner_url" },
};

// guarda los cambios del formulario de perfil
export async function updateProfile(
  username: string,
  bio: string,
  emailNotificationsEnabled: boolean,
): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return { error: "No autenticado." };

  const trimmedUsername = username.trim();
  if (!trimmedUsername) return { error: "El nombre de usuario no puede estar vacío." };

  const { error } = await supabase
    .from("users")
    .update({
      username: trimmedUsername,
      bio: bio.trim() || null,
      email_notifications_enabled: emailNotificationsEnabled,
    })
    .eq("id", userId);

  return { error: error?.message };
}

// guarda la foto de perfil o el banner (solo Premium): la misma lógica que la portada de una obra
export async function updateProfileImage(formData: FormData): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return { error: "No autenticado." };

  if ((await getCurrentPlan()) === "free") return { error: "Personalizar tu perfil es de Premium." };

  const kind = formData.get("kind") === "banner" ? "banner" : "avatar";
  const image = formData.get("image");
  if (!(image instanceof File)) return { error: "Elige una imagen." };

  const { width, height, column } = PROFILE_IMAGES[kind];
  const converted = await convertToWebp(image, { maxSizeMB: 3, width, height });
  if (converted.buffer === undefined) return { error: converted.error };

  const uploaded = await uploadWebp("profile-media", `${userId}/${kind}.webp`, converted.buffer);
  if (uploaded.url === undefined) return { error: "No se pudo subir la imagen. Intenta de nuevo." };

  const { error } = await supabase.from("users").update({ [column]: uploaded.url }).eq("id", userId);
  return { error: error?.message };
}
