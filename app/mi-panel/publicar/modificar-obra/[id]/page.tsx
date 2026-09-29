import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGenres } from "@/lib/works_queries";
import { getMyWorkForEdit } from "@/lib/panel_queries";
import { EditWorkForm } from "@/components/WorkForm/edit-work-form";

interface ModificarObraFormPageProps {
  params: Promise<{ id: string }>;
}

// formulario para modificar una obra del autor
export default async function ModificarObraFormPage({ params }: ModificarObraFormPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const [work, genres] = await Promise.all([getMyWorkForEdit(userId, id), getGenres()]);

  if (!work) {
    notFound();
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/mi-panel/publicar/modificar-obra"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Elegir otra obra
        </Link>
        <h1 className="text-2xl font-bold">Modificar obra</h1>
        <p className="text-muted-foreground">{work.title}</p>
      </div>
      <EditWorkForm genres={genres} work={work} />
    </div>
  );
}
