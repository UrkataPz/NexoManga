"use client";

import { AlertCircle, Check, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PageStatus = "idle" | "uploading" | "done" | "error";

export interface PageItem {
  id: string;
  file: File;
  previewUrl: string;
  status: PageStatus;
}

interface PageListProps {
  pages: PageItem[];
  onChange: (pages: PageItem[]) => void;
  locked: boolean;
}

const STATUS_TEXT: Record<PageStatus, string> = {
  idle: "",
  uploading: "Subiendo...",
  done: "Lista",
  error: "Error al subir",
};

// lista de páginas del capítulo con miniatura, flechas para reordenar y botón para quitar
export function PageList({ pages, onChange, locked }: PageListProps) {
  // intercambia una página con la de arriba (-1) o la de abajo (+1)
  const movePage = (index: number, direction: -1 | 1) => {
    const next = [...pages];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };

  // quita una página de la lista y libera su vista previa
  const removePage = (index: number) => {
    URL.revokeObjectURL(pages[index].previewUrl);
    onChange(pages.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Al guardar, las páginas se renombran pg-1, pg-2… según este orden.
      </p>

      <ol className="flex flex-col gap-2">
        {pages.map((page, index) => (
          <li
            key={page.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-2",
              page.status === "done" && "border-green-600/40",
              page.status === "error" && "border-destructive/60",
            )}
          >
            <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">{index + 1}</span>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.previewUrl}
              alt={`Página ${index + 1}`}
              className="h-16 w-11 shrink-0 rounded-md bg-muted object-cover"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{page.file.name}</p>
              <p
                className={cn(
                  "text-xs text-muted-foreground",
                  page.status === "error" && "text-destructive",
                )}
              >
                {(page.file.size / 1024 / 1024).toFixed(1)} MB
                {page.status !== "idle" && ` · ${STATUS_TEXT[page.status]}`}
              </p>
            </div>

            {page.status === "uploading" && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
            {page.status === "done" && <Check size={18} className="text-green-600" />}
            {page.status === "error" && <AlertCircle size={18} className="text-destructive" />}

            <div className="flex shrink-0 items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Subir página"
                disabled={locked || index === 0}
                onClick={() => movePage(index, -1)}
              >
                <ChevronUp size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Bajar página"
                disabled={locked || index === pages.length - 1}
                onClick={() => movePage(index, 1)}
              >
                <ChevronDown size={16} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Quitar página"
                disabled={locked}
                onClick={() => removePage(index)}
              >
                <X size={16} />
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
