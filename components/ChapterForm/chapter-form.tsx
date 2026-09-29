"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageList, type PageItem } from "@/components/ChapterForm/page-list";
import { ChapterPreview } from "@/components/ChapterForm/chapter-preview";
import {
  createChapterDraft,
  publishChapter,
  uploadChapterPage,
} from "@/features/chapters/save-chapter";
import {
  CHAPTER_ACCESS,
  CHAPTER_ACCESS_LABELS,
  CHAPTER_MAX_PAGES,
  CHAPTER_PAGE_MAX_MB,
  CHAPTER_PDF_MAX_MB,
  LANGUAGES,
  PUBLISH_MODES,
  PUBLISH_MODE_LABELS,
  type ChapterAccess,
  type PublishMode,
} from "@/features/chapters/chapter-options";
import { pdfToImages } from "@/lib/pdf-to-images";
import type { MyWork } from "@/lib/panel_queries";

interface ChapterFormProps {
  works: MyWork[];
}

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const selectClassName = "h-9 rounded-md border border-input bg-background px-3 text-sm";
export const fileBoxClassName =
  "flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed p-4 text-center text-sm hover:bg-accent has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";

const SUCCESS_MESSAGES: Record<PublishMode, string> = {
  now: "Capítulo publicado.",
  schedule: "Capítulo programado.",
  draft: "Capítulo guardado como borrador.",
};

// número sugerido para el siguiente capítulo de una obra
function suggestNextNumber(work: MyWork | undefined): string {
  return String(work?.lastChapterNumber ? Math.floor(work.lastChapterNumber) + 1 : 1);
}

// acceso sugerido: el primer capítulo libre, los demás con VLN
function suggestAccess(work: MyWork | undefined): ChapterAccess {
  return work && work.lastChapterNumber === null ? "free" : "vln";
}

// convierte archivos elegidos en elementos de la lista de páginas
export function toPageItems(files: File[]): PageItem[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    status: "idle",
  }));
}

// barra de progreso 
export function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// formulario de publicar capítulo de Mi panel
export function ChapterForm({ works }: ChapterFormProps) {
  const router = useRouter();
  const [workId, setWorkId] = useState(works[0]?.id ?? "");
  const [chapterNumber, setChapterNumber] = useState(suggestNextNumber(works[0]));
  const [access, setAccess] = useState<ChapterAccess>(suggestAccess(works[0]));
  const [mode, setMode] = useState<PublishMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [pages, setPages] = useState<PageItem[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const selectedWork = works.find((work) => work.id === workId);
  const isLocked = chapterId !== null || isSubmitting;
  const isPreparingPdf = pdfProgress !== null;
  const uploadedCount = pages.filter((page) => page.status === "done").length;
  const uploadProgress = pages.length > 0 ? Math.round((uploadedCount / pages.length) * 100) : 0;

  // al cambiar de obra, sugiere el siguiente número y el acceso por defecto
  const handleWorkChange = (id: string) => {
    const work = works.find((w) => w.id === id);
    setWorkId(id);
    setChapterNumber(suggestNextNumber(work));
    setAccess(suggestAccess(work));
  };

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

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); //ordena las paginas segun el numero en el nombre
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

  // crea el borrador, sube las páginas una por una y termina según el modo elegido
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    if (pages.length === 0) {
      setError("Agrega las páginas del capítulo.");
      return;
    }
    if (mode === "schedule" && !(new Date(scheduledAt).getTime() > Date.now())) {
      setError("Elige una fecha y hora futura para programar el capítulo.");
      return;
    }

    setIsSubmitting(true);

    let currentChapterId = chapterId;
    if (currentChapterId === null) {
      formData.set("contentType", pdfFile ? "pdf" : "images");
      formData.set("pageCount", String(pages.length));
      const draft = await createChapterDraft(formData);
      if (draft.chapterId === undefined) {
        setError(draft.error);
        setIsSubmitting(false);
        return;
      }
      currentChapterId = draft.chapterId;
      setChapterId(currentChapterId);
    }

    const updatedPages = [...pages];
    for (let index = 0; index < updatedPages.length; index++) {
      if (updatedPages[index].status === "done") continue;

      updatedPages[index] = { ...updatedPages[index], status: "uploading" };
      setPages([...updatedPages]);

      const pageData = new FormData();
      pageData.set("chapterId", currentChapterId);
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
    const published = await publishChapter(currentChapterId, updatedPages.length, mode, scheduledIso);
    if (published.error) {
      setError(published.error);
      setIsSubmitting(false);
      return;
    }

    toast.success(SUCCESS_MESSAGES[mode]);
    router.push(`/obra/${workId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset disabled={isLocked} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="grid gap-2">
            <Label htmlFor="workId">Obra *</Label>
            <select
              id="workId"
              name="workId"
              value={workId}
              onChange={(event) => handleWorkChange(event.target.value)}
              className={selectClassName}
            >
              {works.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.title}
                  {work.moderationStatus === "pending" ? " (en revisión)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="chapterNumber">Número de capítulo *</Label>
            <Input
              id="chapterNumber"
              name="chapterNumber"
              type="number"
              min="0"
              step="any"
              required
              value={chapterNumber}
              onChange={(event) => setChapterNumber(event.target.value)}
            />
          </div>
        </div>

        {selectedWork?.moderationStatus === "pending" && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            Tu obra está en revisión: el capítulo se mostrará en la fecha elegida o cuando se apruebe
            la obra, lo que ocurra después.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" maxLength={150} placeholder="Opcional" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="language">Idioma original *</Label>
            <select id="language" name="language" defaultValue="es" className={selectClassName}>
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
                  checked={access === option}
                  onChange={() => setAccess(option)}
                  className="accent-primary"
                />
                {CHAPTER_ACCESS_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">Páginas *</span>

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
            <PageList pages={pages} onChange={setPages} locked={isLocked} />
          )}

          {pages.length > 0 && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clearPages}>
                Quitar todo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? "Ocultar vista previa" : "Ver vista previa"}
              </Button>
            </div>
          )}

          {showPreview && pages.length > 0 && <ChapterPreview urls={pages.map((page) => page.previewUrl)} />}
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
                {PUBLISH_MODE_LABELS[option]}
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
              />
            </div>
          )}
        </fieldset>
      </fieldset>

      <div className="flex flex-col gap-3">
        {isSubmitting && <ProgressBar label="Subiendo páginas..." value={uploadProgress} />}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {chapterId && !isSubmitting && (
          <p className="text-xs text-muted-foreground">
            El capítulo ya se guardó como borrador; solo falta terminar de subir las páginas.
          </p>
        )}

        <Button type="submit" disabled={isSubmitting || isPreparingPdf} className="self-start">
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Subiendo...
            </>
          ) : chapterId ? (
            "Reintentar subida"
          ) : (
            PUBLISH_MODE_LABELS[mode]
          )}
        </Button>
      </div>
    </form>
  );
}
