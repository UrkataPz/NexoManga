//---------------
// filtro simple
//---------------
import { Button } from "@/components/ui/button";
import { WORK_TYPES, WORK_TYPE_LABELS, WORK_STATUSES, WORK_STATUS_LABELS } from "@/features/works/work-options";
import type { Genre } from "@/lib/works_queries";

interface WorkFiltersProps {
  action: string;
  genres: Genre[];
  languages: string[];
  defaultValues: {
    query?: string;
    type?: string;
    status?: string;
    genreId?: string;
    language?: string;
    sort?: string;
  };
}

const selectClassName =
  "h-9 rounded-md border border-input bg-background px-3 text-sm";

// formulario de filtro
export function WorkFilters({ action, genres, languages, defaultValues }: WorkFiltersProps) {
  return (
    <form
      action={action}
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="query" className="text-xs text-muted-foreground">
          Buscar
        </label>
        <input
          id="query"
          name="query"
          defaultValue={defaultValues.query}
          placeholder="Título..."
          className={selectClassName}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-xs text-muted-foreground">
          Tipo
        </label>
        <select id="type" name="type" defaultValue={defaultValues.type ?? ""} className={selectClassName}>
          <option value="">Cualquiera</option>
          {WORK_TYPES.map((type) => (
            <option key={type} value={type}>
              {WORK_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-xs text-muted-foreground">
          Estado
        </label>
        <select id="status" name="status" defaultValue={defaultValues.status ?? ""} className={selectClassName}>
          <option value="">Cualquiera</option>
          {WORK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {WORK_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="genreId" className="text-xs text-muted-foreground">
          Género
        </label>
        <select id="genreId" name="genreId" defaultValue={defaultValues.genreId ?? ""} className={selectClassName}>
          <option value="">Cualquiera</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="language" className="text-xs text-muted-foreground">
          Idioma
        </label>
        <select id="language" name="language" defaultValue={defaultValues.language ?? ""} className={selectClassName}>
          <option value="">Cualquiera</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sort" className="text-xs text-muted-foreground">
          Ordenar
        </label>
        <select id="sort" name="sort" defaultValue={defaultValues.sort ?? "recent"} className={selectClassName}>
          <option value="recent">Más recientes</option>
          <option value="title">Título (A-Z)</option>
        </select>
      </div>

      <Button type="submit" size="sm">
        Filtrar
      </Button>
    </form>
  );
}
//---------------
