// estilos compartidos de los formularios de cuenta (fondo oscuro, acento rosa)
export const authInputClass =
  "h-10 border-neutral-700 bg-neutral-950/80 text-neutral-100 placeholder:text-neutral-500 focus-visible:ring-brand [color-scheme:dark]";
export const authButtonClass = "manga-button w-full";
export const authLinkClass = "font-semibold text-brand underline-offset-4 hover:underline";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
}

// tarjeta tipo viñeta de manga: borde grueso, sombra rosa desplazada y un globo de texto
export function AuthCard({ title, subtitle, badge, children }: AuthCardProps) {
  return (
    <div className="relative w-full rounded-xl border-2 border-neutral-100 bg-neutral-900/95 p-6 shadow-[8px_8px_0_0_#ff2d6f] sm:p-8">
      {badge && (
        <span className="absolute -right-3 -top-4 rotate-6 rounded-full border-2 border-neutral-950 bg-neutral-100 px-4 py-1 text-sm font-black uppercase text-neutral-950">
          {badge}
        </span>
      )}
      <h1 className="text-3xl font-bold uppercase tracking-wide">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
