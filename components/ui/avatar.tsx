import { cn, seedToHslColor } from "@/lib/utils";

interface AvatarProps {
  imageUrl: string | null;
  name: string;
  className?: string;
}

export function Avatar({ imageUrl, name, className }: AvatarProps) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={cn("h-8 w-8 rounded-full object-cover", className)}
      />
    );
  }

  const initial = name.charAt(0).toUpperCase();

  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: seedToHslColor(name) }}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white",
        className,
      )}
    >
      {initial}
    </span>
  );
}