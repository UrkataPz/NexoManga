"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload/image-upload";
import { PremiumNotice } from "@/components/Premium/premium-notice";
import { updateProfileImage } from "@/features/profile/update-profile";

// foto de perfil y banner: solo los Premium pueden cambiarlos
export function ProfileImagePickers({ isPremium }: { isPremium: boolean }) {
  const router = useRouter();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isPremium) {
    return <PremiumNotice message="Cambiar tu foto de perfil y tu banner es parte de Premium." />;
  }

  // manda una imagen (foto o banner) al servidor
  const upload = (kind: "avatar" | "banner", file: File) => {
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("image", file);
    return updateProfileImage(formData);
  };

  // guarda las imágenes elegidas y recarga el perfil
  const handleSave = async () => {
    setIsSaving(true);
    const results = [];
    if (avatar) results.push(await upload("avatar", avatar));
    if (banner) results.push(await upload("banner", banner));
    setIsSaving(false);

    const failed = results.find((result) => result.error);
    if (failed) {
      toast.error(failed.error);
      return;
    }
    toast.success("Imágenes guardadas.");
    router.refresh();
  };

  return (
    <div className="grid gap-4 rounded-lg border border-dashed border-border bg-card p-4 sm:grid-cols-2">
      <ImageUpload label="Foto de perfil" onFileSelected={setAvatar} />
      <ImageUpload label="Banner" onFileSelected={setBanner} />
      <Button onClick={handleSave} disabled={isSaving || (!avatar && !banner)} className="sm:col-span-2">
        {isSaving ? "Guardando..." : "Guardar imágenes"}
      </Button>
    </div>
  );
}
