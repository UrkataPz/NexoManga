import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/users_queries";
import { getCurrentPlan } from "@/lib/subscriptions_queries";
import { ProfileDisplay } from "@/components/Profile/profile-display";
import { AuthorWorksSection } from "@/components/Profile/author-works-section";
import { ProfileForm } from "@/components/Profile/profile-form";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { ProfileImagePickers } from "@/components/Profile/profile-image-pickers";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [profile, plan] = await Promise.all([getMyProfile(userId), getCurrentPlan()]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Mi perfil</h1>

      <ProfileDisplay
        username={profile?.username ?? "Usuario"}
        bio={profile?.bio ?? null}
        avatarUrl={profile?.avatarUrl ?? null}
        bannerUrl={profile?.bannerUrl ?? null}
      />

      <AuthorWorksSection userId={userId} />

      <ProfileImagePickers isPremium={plan !== "free"} />

      <ProfileForm
        initialUsername={profile?.username ?? ""}
        initialBio={profile?.bio ?? ""}
        initialEmailNotifications={profile?.emailNotificationsEnabled ?? true}
      />

      <div>
        <h2 className="mb-2 text-lg font-semibold">Cambiar contraseña</h2>
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
