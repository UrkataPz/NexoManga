import { CommunityTabs } from "@/components/Community/community-tabs";

// marco de comunidad: título, las 3 pestañas y debajo la página elegida
export default function ComunidadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Comunidad</h1>
        <CommunityTabs />
      </div>
      {children}
    </div>
  );
}
