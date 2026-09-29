import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyChapterForEdit } from "@/lib/panel_queries";
import { EditChapterForm } from "@/components/ChapterForm/edit-chapter-form";

interface ModificarCapituloFormPageProps {
  params: Promise<{ id: string }>;
}

// formulario para modificar un capítulo del autor
export default async function ModificarCapituloFormPage({ params }: ModificarCapituloFormPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const chapter = await getMyChapterForEdit(userId, id);

  if (!chapter) {
    notFound();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/mi-panel/publicar/modificar-capitulo"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Elegir otro capítulo
        </Link>
        <h1 className="text-2xl font-bold">Modificar capítulo {chapter.chapterNumber}</h1>
        <p className="text-muted-foreground">{chapter.workTitle}</p>
      </div>
      <EditChapterForm chapter={chapter} />
    </div>
  );
}
