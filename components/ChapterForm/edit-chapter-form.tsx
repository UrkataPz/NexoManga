"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageList, type PageItem } from "@/components/ChapterForm/page-list";
import {
  ACCEPTED_IMAGE_TYPES,
  fileBoxClassName,
  ProgressBar,
  selectClassName,
  toPageItems,
} from "@/components/ChapterForm/chapter-form";
import { publishChapter, updateChapterDetails, uploadChapterPage } from "@/features/chapters/save-chapter";
import {
  CHAPTER_ACCESS,
  CHAPTER_ACCESS_LABELS,
  CHAPTER_MAX_PAGES,
  CHAPTER_PAGE_MAX_MB,
  CHAPTER_PDF_MAX_MB,
  LANGUAGES,
  PUBLISH_MODES,
  PUBLISH_MODE_LABELS,
  type ChapterState,
  type PublishMode,
} from "@/features/chapters/chapter-options";
import { pdfToImages } from "@/lib/pdf-to-images";
import type { EditableChapter } from "@/lib/panel_queries";

interface EditChapterFormProps {
  chapter: EditableChapter;
}

// opción de publicación que aparece marcada según cómo está el capítulo
const MODE_BY_STATE: Record<ChapterState, PublishMode> = {
  draft: "draft",
  scheduled: "schedule",
  published: "now",
};

// convierte una fecha guardada al formato del campo "fecha y hora" (hora local)
function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

// formulario de modificar capítulo: datos cargados y las páginas se vuelven a subir completas
export function EditChapterForm({ chapter }: EditChapterFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<PublishMode>(MODE_BY_STATE[chapter.state]);
  const [scheduledAt, setScheduledAt] = useState(
    chapter.state === "scheduled" ? toDateTimeLocal(chapter.publicationDate) : "",
  );
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
      (file) =>
        !ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > CHAPTER_PAGE_MAX_MB * 1024 * 1024,
    );
    if (invalid) {
      toast.error(`"${invalid.name}" debe ser JPG, PNG o WEBP de máximo ${CHAPTER_PAGE_MAX_MB} MB.`);
      return;
    }
    if (pages.length + files.length > CHAPTER_MAX_PAGES) {
      toast.error(`Un capítulo puede tener máximo ${CHAPTER_MAX_PAGES} páginas.`);
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
      const images = await pdfToImages(file, (done, total) =>
        setPdfProgress(Math.round((done / total) * 100)),
      );
      setPages(toPageItems(images));
    } catch (pdfError) {
      console.error(pdfError);
      setPdfFile(null);
      toast.error(`No se pudo leer el PDF. Revisa que no esté dañado y tenga máximo ${CHAPTER_MAX_PAGES} páginas.`);
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

  // guarda los datos, sube las páginas nuevas una por una (reemplazan a las anteriores) y publica
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    if (mode === "schedule" && !(new Date(scheduledAt).getTime() > Date.now())) {
      setError("Elige una fecha y hora futura para programar el capítulo.");
      return;
    }

    setIsSubmitting(true);
    // si no subieron páginas nuevas, se conserva el tipo de contenido actual
    const hasNewPages = pages.length > 0;
    formData.set("contentType", !hasNewPages ? chapter.contentType : pdfFile ? "pdf" : "images");

    const updated = await updateChapterDetails(chapter.id, formData);
    if (updated.error) {
      setError(updated.error);
      setIsSubmitting(false);
      return;
    }

    const updatedPages = [...pages];
    for (let index = 0; index < updatedPages.length; index++) {
      if (updatedPages[index].status === "done") continue;

      updatedPages[index] = { ...updatedPages[index], status: "uploading" };
      setPages([...updatedPages]);

      const pageData = new FormData();
      pageData.set("chapterId", chapter.id);
      pageData.set("pageNumber", String(index + 1));
      pageData.set("page", updatedPages[index].file);
      const result = await uploadChapterPage(pageData);

      updatedPages[index] = { ...updatedPages[index], status: result.error ? "error" : "done" };
      setPages([...updatedPages]);

      if (result.error) {
        setError(`Página ${index + 1}: ${result.error}`);
        setIsSubmitting(false);
        return;
      }
    }

    const scheduledIso = mode === "schedule" ? new Date(scheduledAt).toISOString() : null;
    // sin páginas nuevas se publican las mismas que ya tenía
    const pageCount = hasNewPages ? updatedPages.length : chapter.pageCount;
    const published = await publishChapter(chapter.id, pageCount, mode, scheduledIso);
    if (published.error) {
      setError(published.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("Capítulo actualizado.");
    router.push(`/obra/${chapter.workId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr_1fr]">
          <div className="grid gap-2">
            <Label htmlFor="chapterNumber">Número *</Label>
            <Input
              id="chapterNumber"
              name="chapterNumber"
              type="number"
              min="0"
              step="any"
              required
              defaultValue={chapter.chapterNumber}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" maxLength={150} placeholder="Opcional" defaultValue={chapter.title ?? ""} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="language">Idioma original *</Label>
            <select id="language" name="language" defaultValue={chapter.language} className={selectClassName}>
              {Object.entries(LANGUAGES).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Acceso</legend>
          <div className="flex flex-wrap gap-4">
            {CHAPTER_ACCESS.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="access"
                  value={option}
                  defaultChecked={chapter.access === option}
                  className="accent-primary"
                />
                {CHAPTER_ACCESS_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">Páginas actuales ({chapter.pageCount})</span>
          <div className="flex gap-2 overflow-x-auto">
            {chapter.pageUrls.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`Página ${index + 1}`}
                loading="lazy"
                className="h-20 w-14 shrink-0 rounded-md bg-muted object-cover"
              />
            ))}
          </div>

          <span className="text-sm font-medium">Páginas corregidas (opcional)</span>
          <p className="text-xs text-muted-foreground">
            Déjalo vacío para conservar las páginas actuales. Si subes el capítulo otra vez, las páginas
            nuevas reemplazan a todas las actuales.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={fileBoxClassName}>
              <ImagePlus size={24} className="text-muted-foreground" />
              <span className="font-medium">Elegir imágenes</span>
              <span className="text-xs text-muted-foreground">
                {pdfFile
                  ? "Ya elegiste un PDF. Quítalo para subir imágenes."
                  : `JPG, PNG o WEBP · máximo ${CHAPTER_PAGE_MAX_MB} MB cada una`}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                disabled={pdfFile !== null || isPreparingPdf}
                onChange={handleImagesSelected}
              />
            </label>

            <label className={fileBoxClassName}>
              <FileText size={24} className="text-muted-foreground" />
              <span className="font-medium">Elegir PDF</span>
              <span className="text-xs text-muted-foreground">
                {pages.length > 0 && !pdfFile
                  ? "Ya elegiste imágenes. Quítalas para subir un PDF."
                  : `Las páginas se toman en el orden del PDF · máximo ${CHAPTER_PDF_MAX_MB} MB`}
              </span>
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                disabled={pages.length > 0 || isPreparingPdf}
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

          {!pdfFile && pages.length > 0 && (
            <PageList pages={pages} onChange={setPages} locked={isSubmitting} />
          )}

          {pages.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={clearPages} className="self-start">
              Quitar todo
            </Button>
          )}
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Publicación</legend>
          <div className="flex flex-wrap gap-4">
            {PUBLISH_MODES.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  value={option}
                  checked={mode === option}
                  onChange={() => setMode(option)}
                  className="accent-primary"
                />
                {option === "now" && chapter.state === "published"
                  ? "Mantener publicado"
                  : PUBLISH_MODE_LABELS[option]}
              </label>
            ))}
          </div>

          {mode === "schedule" && (
            <div className="grid max-w-xs gap-2">
              <Label htmlFor="scheduledAt">Fecha y hora de publicación</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                suppressHydrationWarning
              />
            </div>
          )}
        </fieldset>
      </fieldset>

      <div className="flex flex-col gap-3">
        {isSubmitting && pages.length > 0 && <ProgressBar label="Subiendo páginas..." value={uploadProgress} />}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" disabled={isSubmitting || isPreparingPdf} className="self-start">
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Subiendo...
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </div>
    </form>
  );
}
