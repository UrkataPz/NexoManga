"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ImageUpload/image-upload";
import { updateWork } from "@/features/works/update-work";
import {
  WORK_STATUSES,
  WORK_STATUS_LABELS,
  WORK_TYPES,
  WORK_TYPE_LABELS,
} from "@/features/works/work-options";
import type { Genre } from "@/lib/works_queries";
import type { EditableWork } from "@/lib/panel_queries";

interface EditWorkFormProps {
  genres: Genre[];
  work: EditableWork;
}

const selectClassName = "h-9 rounded-md border border-input bg-background px-3 text-sm";

// formulario de modificar obra: los mismos campos de publicar, ya cargados; la portada es opcional
export function EditWorkForm({ genres, work }: EditWorkFormProps) {
  const router = useRouter();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // guarda la portada nueva elegida y arma su vista previa
  const handleCoverSelected = (file: File | null) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  // envía los cambios al servidor y, si sale bien, abre la página de la obra
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    if (coverFile) formData.set("cover", coverFile);

    const result = await updateWork(work.id, formData);

    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    toast.success("Cambios guardados.");
    router.push(`/obra/${work.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_auto]">
      {work.moderationStatus === "rejected" && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm lg:col-span-2">
          Tu obra fue rechazada: {work.moderationNote ?? "sin motivo indicado"}. Al guardar los
          cambios vuelve a revisión.
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Título *</Label>
          <Input id="title" name="title" required maxLength={150} defaultValue={work.title} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="alternativeTitles">Títulos alternativos</Label>
          <Input
            id="alternativeTitles"
            name="alternativeTitles"
            placeholder="Separados por coma: Título en inglés, Título original"
            defaultValue={work.alternativeTitles.join(", ")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="type">Tipo *</Label>
            <select id="type" name="type" defaultValue={work.type} className={selectClassName}>
              {WORK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {WORK_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Estado *</Label>
            <select id="status" name="status" defaultValue={work.status} className={selectClassName}>
              {WORK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {WORK_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="synopsis">Sinopsis</Label>
          <Textarea id="synopsis" name="synopsis" rows={5} maxLength={2000} defaultValue={work.synopsis ?? ""} />
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Géneros</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {genres.map((genre) => (
              <div key={genre.id} className="flex items-center gap-2">
                <Checkbox
                  id={`genre-${genre.id}`}
                  name="genreIds"
                  value={genre.id}
                  defaultChecked={work.genreIds.includes(genre.id)}
                />
                <Label htmlFor={`genre-${genre.id}`} className="font-normal">
                  {genre.name}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col gap-4 lg:w-72">
        <ImageUpload label="Portada nueva (opcional)" onFileSelected={handleCoverSelected} showPreview={false} />

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {coverPreview ? "Portada nueva" : "Portada actual"}
          </span>
          <div className="h-60 w-40 overflow-hidden rounded-lg bg-muted">
            {(coverPreview ?? work.coverUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview ?? work.coverUrl ?? ""} alt="Portada" className="h-full w-full object-cover" />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:col-span-2">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" disabled={isSaving} className="self-start">
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
