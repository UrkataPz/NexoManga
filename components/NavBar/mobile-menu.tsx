"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface MobileMenuProps {
  links: { href: string; label: string }[];
}

// botón ☰ de pantallas chicas: abre y cierra la lista de enlaces debajo del nav
export function MobileMenu({ links }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-brand"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-full flex flex-col gap-1 border-b border-white/10 bg-black/95 p-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="rounded-md px-3 py-3 font-semibold transition-colors hover:bg-brand hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
