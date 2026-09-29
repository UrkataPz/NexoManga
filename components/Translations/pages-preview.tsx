interface PagesPreviewProps {
  title: string;
  urls: string[];
}

// fila de miniaturas de páginas; cada una se abre en grande en otra pestaña
export function PagesPreview({ title, urls }: PagesPreviewProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">
        {title} ({urls.length})
      </h2>
      {urls.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay páginas.</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {urls.map((url, index) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Página ${index + 1}`}
                loading="lazy"
                className="h-28 w-20 rounded-md bg-muted object-cover hover:ring-2 hover:ring-brand"
              />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
