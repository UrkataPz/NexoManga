"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ImageUpload/image-upload";
import { createWork } from "@/features/works/create-work";
import {
  WORK_STATUSES,
  WORK_STATUS_LABELS,
  WORK_TYPES,
  WORK_TYPE_LABELS,
} from "@/features/works/work-options";
import type { Genre } from "@/lib/works_queries";

interface WorkFormProps {
  genres: Genre[];
}

const selectClassName = "h-9 rounded-md border border-input bg-background px-3 text-sm";

// formulario de publicar obra (Mi panel y /publicar)
export function WorkForm({ genres }: WorkFormProps) {
  const router = useRouter();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // guarda la portada elegida y arma su vista previa
  const handleCoverSelected = (file: File | null) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  // envía el formulario al servidor y, si sale bien, abre la página de la obra
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!coverFile) {
      setError("La portada es obligatoria.");
      return;
    }

    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    formData.set("cover", coverFile);

    const result = await createWork(formData);

    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    toast.success("Obra creada.");
    router.push(`/obra/${result.workId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Título *</Label>
          <Input id="title" name="title" required maxLength={150} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="alternativeTitles">Títulos alternativos</Label>
          <Input
            id="alternativeTitles"
            name="alternativeTitles"
            placeholder="Separados por coma: Título en inglés, Título original"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="type">Tipo *</Label>
            <select id="type" name="type" required defaultValue="" className={selectClassName}>
              <option value="" disabled>
                Selecciona un tipo
              </option>
              {WORK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {WORK_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Estado *</Label>
            <select id="status" name="status" defaultValue="ongoing" className={selectClassName}>
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
          <Textarea id="synopsis" name="synopsis" rows={5} maxLength={2000} />
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Géneros</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {genres.map((genre) => (
              <div key={genre.id} className="flex items-center gap-2">
                <Checkbox id={`genre-${genre.id}`} name="genreIds" value={genre.id} />
                <Label htmlFor={`genre-${genre.id}`} className="font-normal">
                  {genre.name}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col gap-4 lg:w-72">
        <ImageUpload label="Portada *" onFileSelected={handleCoverSelected} showPreview={false} />

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Así se verá tu portada</span>
          <div className="flex h-60 w-40 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="Vista previa de la portada" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon size={32} className="text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:col-span-2">
        {/* sin aceptar los términos, el botón de publicar queda apagado */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="acceptedTerms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
          />
          <Label htmlFor="acceptedTerms" className="font-normal">
            Declaro que tengo los derechos de esta obra y acepto los términos de NexoManga.
          </Label>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" disabled={isSaving || !acceptedTerms} className="self-start">
          {isSaving ? "Publicando..." : "Publicar obra"}
        </Button>
      </div>
    </form>
  );
}
