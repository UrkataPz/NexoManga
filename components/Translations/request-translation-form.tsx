"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requestTranslation } from "@/features/translations/author-actions";
import { LANGUAGES } from "@/features/chapters/chapter-options";
import { MATERIAL_TYPES, MATERIAL_TYPE_HELP, MATERIAL_TYPE_LABELS } from "@/features/translations/translation-options";
import type { TranslatableChapter } from "@/lib/translations_queries";

interface RequestTranslationFormProps {
  chapters: TranslatableChapter[];
}

const selectClassName = "h-9 rounded-md border border-input bg-background px-3 text-sm";

// formulario del autor para pedir la traducción de un capítulo publicado
export function RequestTranslationForm({ chapters }: RequestTranslationFormProps) {
  const router = useRouter();
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // idiomas que se pueden pedir: ni el original ni uno que ya se pidió
  const selectedChapter = chapters.find((chapter) => chapter.id === chapterId);
  const availableLanguages = Object.entries(LANGUAGES).filter(
    ([code]) => code !== selectedChapter?.originalLanguage && !selectedChapter?.requestedLanguages.includes(code),
  );

  // manda la solicitud y recarga la lista de "Mis solicitudes"
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSending(true);
    setError(null);

    const result = await requestTranslation(new FormData(event.currentTarget));
    setIsSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Solicitud publicada en el tablero de traducciones.");
    router.refresh();
  };

  if (chapters.length === 0) {
    return <p className="text-sm text-muted-foreground">Publica un capítulo para poder pedir su traducción.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="chapterId">Capítulo</Label>
          <select
            id="chapterId"
            name="chapterId"
            value={chapterId}
            onChange={(event) => setChapterId(event.target.value)}
            className={selectClassName}
          >
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="targetLanguage">Traducir al</Label>
          <select key={chapterId} id="targetLanguage" name="targetLanguage" className={selectClassName}>
            {availableLanguages.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Material que le das al traductor</legend>
        {MATERIAL_TYPES.map((type, index) => (
          <label key={type} className="flex items-start gap-2 text-sm">
            <input type="radio" name="materialType" value={type} defaultChecked={index === 0} className="mt-1 accent-brand" />
            <span>
              <strong>{MATERIAL_TYPE_LABELS[type]}</strong>
              <span className="block text-xs text-muted-foreground">{MATERIAL_TYPE_HELP[type]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={isSending || availableLanguages.length === 0} className="self-start">
        {isSending ? "Publicando..." : "Pedir traducción"}
      </Button>
    </form>
  );
}
