import { Avatar } from "@/components/ui/avatar";
import { seedToHslColor } from "@/lib/utils";

interface ProfileDisplayProps {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  children?: React.ReactNode;
}

// tarjeta de perfil: banner, avatar, nombre, bio — se reutiliza en /perfil y en el
// perfil público de comunidad
export function ProfileDisplay({ username, bio, avatarUrl, bannerUrl, children }: ProfileDisplayProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className="h-24 w-full sm:h-36"
        style={bannerUrl ? undefined : { backgroundColor: seedToHslColor(`banner-${username}`) }}
      >
        {bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="flex flex-col items-center gap-3 p-4 text-center sm:flex-row sm:items-end sm:text-left">
        <Avatar
          imageUrl={avatarUrl}
          name={username}
          className="-mt-12 h-20 w-20 shrink-0 border-4 border-background text-2xl shadow-md sm:-mt-16 sm:h-28 sm:w-28"
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">{username}</h1>
          <p className="text-sm text-muted-foreground">@{username}</p>
        </div>

        {children}
      </div>

      {bio && (
        <p className="whitespace-pre-wrap border-t border-border px-4 py-3 text-sm text-muted-foreground">
          {bio}
        </p>
      )}
    </div>
  );
}
