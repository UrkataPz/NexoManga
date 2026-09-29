"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageList, type PageItem } from "@/components/ChapterForm/page-list";
import {
  ACCEPTED_IMAGE_TYPES,
  fileBoxClassName,
  ProgressBar,
  toPageItems,
} from "@/components/ChapterForm/chapter-form";
import { submitTranslation, uploadTranslationPage } from "@/features/translations/translator-actions";
import { CHAPTER_PAGE_MAX_MB, CHAPTER_PDF_MAX_MB } from "@/features/chapters/chapter-options";
import { pdfToImages } from "@/lib/pdf-to-images";

interface TranslationUploadFormProps {
  jobId: string;
  originalPageCount: number;
}

// subir las páginas traducidas: igual que subir un capítulo (imágenes o PDF, página por página)
export function TranslationUploadForm({ jobId, originalPageCount }: TranslationUploadFormProps) {
  const router = useRouter();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPreparingPdf = pdfProgress !== null;
  const uploadedCount = pages.filter((page) => page.status === "done").length;
  const uploadProgress = pages.length > 0 ? Math.round((uploadedCount / pages.length) * 100) : 0;

  // agrega las imágenes elegidas, ordenadas por nombre en orden natural
  const handleImagesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    const invalid = files.find(
      (file) => !ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > CHAPTER_PAGE_MAX_MB * 1024 * 1024,
    );
    if (invalid) {
      toast.error(`"${invalid.name}" debe ser JPG, PNG o WEBP de máximo ${CHAPTER_PAGE_MAX_MB} MB.`);
      return;
    }

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setPages([...pages, ...toPageItems(files)]);
  };

  // convierte el PDF elegido en imágenes, una página a la vez
  const handlePdfSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf" || file.size > CHAPTER_PDF_MAX_MB * 1024 * 1024) {
      toast.error(`El archivo debe ser un PDF de máximo ${CHAPTER_PDF_MAX_MB} MB.`);
      return;
    }

    setPdfFile(file);
    setPdfProgress(0);
    try {
      const images = await pdfToImages(file, (done, total) => setPdfProgress(Math.round((done / total) * 100)));
      setPages(toPageItems(images));
    } catch (pdfError) {
      console.error(pdfError);
      setPdfFile(null);
      toast.error("No se pudo leer el PDF. Revisa que no esté dañado.");
    } finally {
      setPdfProgress(null);
    }
  };

  // quita todas las páginas (o el PDF) para empezar de nuevo
  const clearPages = () => {
    pages.forEach((page) => URL.revokeObjectURL(page.previewUrl));
    setPages([]);
    setPdfFile(null);
  };

  // sube las páginas una por una y, al final, entrega la traducción al autor
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (pages.length !== originalPageCount) {
      setError(`Debes subir exactamente ${originalPageCount} páginas (las mismas del original).`);
      return;
    }

    setIsSubmitting(true);
    const updatedPages = [...pages];
    for (let index = 0; index < updatedPages.length; index++) {
      if (updatedPages[index].status === "done") continue;

      updatedPages[index] = { ...updatedPages[index], status: "uploading" };
      setPages([...updatedPages]);

      const pageData = new FormData();
      pageData.set("jobId", jobId);
      pageData.set("pageNumber", String(index + 1));
      pageData.set("page", updatedPages[index].file);
      const result = await uploadTranslationPage(pageData);

      updatedPages[index] = { ...updatedPages[index], status: result.error ? "error" : "done" };
      setPages([...updatedPages]);

      if (result.error) {
        setError(`Página ${index + 1}: ${result.error}`);
        setIsSubmitting(false);
        return;
      }
    }

    const submitted = await submitTranslation(jobId, updatedPages.length);
    if (submitted.error) {
      setError(submitted.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("Traducción enviada. El autor la va a revisar.");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <span className="text-sm font-medium">
        Páginas traducidas ({pages.length} de {originalPageCount})
      </span>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={fileBoxClassName}>
          <ImagePlus size={24} className="text-muted-foreground" />
          <span className="font-medium">Elegir imágenes</span>
          <span className="text-xs text-muted-foreground">
            {pdfFile ? "Ya elegiste un PDF. Quítalo para subir imágenes." : `JPG, PNG o WEBP · máximo ${CHAPTER_PAGE_MAX_MB} MB cada una`}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            disabled={pdfFile !== null || isPreparingPdf || isSubmitting}
            onChange={handleImagesSelected}
          />
        </label>

        <label className={fileBoxClassName}>
          <FileText size={24} className="text-muted-foreground" />
          <span className="font-medium">Elegir PDF</span>
          <span className="text-xs text-muted-foreground">
            {pages.length > 0 && !pdfFile ? "Ya elegiste imágenes. Quítalas para subir un PDF." : `Máximo ${CHAPTER_PDF_MAX_MB} MB`}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            disabled={pages.length > 0 || isPreparingPdf || isSubmitting}
            onChange={handlePdfSelected}
          />
        </label>
      </div>

      {pdfProgress !== null && <ProgressBar label="Preparando PDF..." value={pdfProgress} />}

      {pdfFile && !isPreparingPdf && (
        <div className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm">
          <FileText size={18} className="shrink-0 text-muted-foreground" />
          <span className="truncate">
            {pdfFile.name} · {pages.length} páginas
          </span>
        </div>
      )}

      {!pdfFile && pages.length > 0 && <PageList pages={pages} onChange={setPages} locked={isSubmitting} />}

      {pages.length > 0 && !isSubmitting && (
        <Button type="button" variant="outline" size="sm" onClick={clearPages} className="self-start">
          Quitar todo
        </Button>
      )}

      {isSubmitting && <ProgressBar label="Subiendo páginas..." value={uploadProgress} />}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isSubmitting || isPreparingPdf} className="self-start">
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Subiendo...
          </>
        ) : (
          "Enviar traducción"
        )}
      </Button>
    </form>
  );
}
