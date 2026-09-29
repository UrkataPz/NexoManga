import { createClient } from "@/lib/supabase/server";

export interface UserProfile {
  username: string;
  profileImageUrl: string | null;
  roles: string[];
}

// trae los datos básicos del usuario logueado (nav, panel)
export async function getCurrentUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("username, profile_image_url, roles")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return {
    username: data.username,
    profileImageUrl: data.profile_image_url,
    roles: data.roles ?? [],
  };
}

export interface MyProfile {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  emailNotificationsEnabled: boolean;
}

// trae los datos completos del usuario logueado, para la página de perfil
export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("username, bio, profile_image_url, banner_url, email_notifications_enabled")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return {
    username: data.username,
    bio: data.bio,
    avatarUrl: data.profile_image_url,
    bannerUrl: data.banner_url,
    emailNotificationsEnabled: data.email_notifications_enabled,
  };
}