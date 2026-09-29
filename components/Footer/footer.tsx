import Image from "next/image";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex w-full flex-col items-center gap-2 border-t border-t-foreground/10 px-5 py-8 text-center">
      <Image
        src="/nexomangaLetters.png"
        alt="NexoManga"
        width={2170}
        height={725}
        className="h-12 w-auto opacity-80"
      />
      <p className="text-xs text-muted-foreground">
        © {year} NexoManga. Todos los derechos reservados.
      </p>
    </footer>
  );
}
