import Image from "next/image";
import Link from "next/link";

// fondo de las pantallas de cuenta: portada del sitio oscurecida, trama de puntos y el logo
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-neutral-950 px-4 py-10 text-neutral-100">
      <Image src="/hero.png" alt="" fill priority className="scale-105 object-cover opacity-40 blur-sm" />
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/40 via-neutral-950/80 to-neutral-950" />
      <div className="absolute inset-0 bg-halftone" />

      <div className="relative flex w-full max-w-md flex-col items-center gap-6">
        <Link href="/" aria-label="Ir al inicio" className="flex flex-col items-center gap-2">
          <Image
            src="/nexomangaLetters.png"
            alt="NexoManga"
            width={2170}
            height={725}
            priority
            className="h-14 w-auto drop-shadow-lg"
          />
          <span className="text-center text-sm text-neutral-300">
            Lee, publica y traduce manga, manhwa y cómics.
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
