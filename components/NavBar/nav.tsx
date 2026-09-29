import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { UserMenu } from "./user-menu";
import { MobileMenu } from "./mobile-menu";

// enlaces principales del sitio (los usan el nav de computadora y el menú del celular)
const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/busqueda-avanzada", label: "Búsqueda Avanzada" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/anuncios", label: "Anuncios" },
];

// estilo de cada enlace: al pasar el mouse, fondo rosa y letra blanca
const linkClass =
  "whitespace-nowrap rounded-md px-3 py-2 font-semibold transition-colors hover:bg-brand hover:text-white";

// barra de arriba: siempre negra semitransparente con letras blancas
export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex h-16 w-full items-center border-b border-white/10 bg-black/70 px-4 text-white backdrop-blur-md sm:px-5">
      {/* izquierda: el logo */}
      <div className="flex flex-1 items-center">
        <Link href="/">
          <Image
            src="/nexomangaLetters.png"
            alt="NexoManga"
            width={2170}
            height={725}
            priority
            className="h-7 w-auto sm:h-9"
          />
        </Link>
      </div>

      {/* centro: los enlaces, solo en pantallas grandes */}
      <div className="hidden items-center gap-1 lg:flex">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass}>
            {link.label}
          </Link>
        ))}
      </div>

      {/* derecha: el menú del usuario y, en pantallas chicas, el botón ☰ */}
      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
        <Suspense>
          <UserMenu />
        </Suspense>
        <MobileMenu links={NAV_LINKS} />
      </div>
    </nav>
  );
}
