"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { updateProfile } from "@/features/profile/update-profile";

interface ProfileFormProps {
  initialUsername: string;
  initialBio: string;
  initialEmailNotifications: boolean;
}

export function ProfileForm({
  initialUsername,
  initialBio,
  initialEmailNotifications,
}: ProfileFormProps) {
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [emailNotifications, setEmailNotifications] = useState(initialEmailNotifications);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateProfile(username, bio, emailNotifications);
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-2">
        <Label htmlFor="username">Nombre de usuario</Label>
        <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bio">Biografía</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={3}
          maxLength={300}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="emailNotifications"
          checked={emailNotifications}
          onCheckedChange={(checked) => setEmailNotifications(checked === true)}
        />
        <Label htmlFor="emailNotifications">Recibir notificaciones por correo</Label>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-green-600">¡Cambios guardados!</p>}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
