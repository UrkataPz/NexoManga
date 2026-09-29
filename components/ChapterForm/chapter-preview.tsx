// vista previa del capítulo: las páginas en orden, una debajo de otra, como en el lector
export function ChapterPreview({ urls }: { urls: string[] }) {
  return (
    <div className="flex max-h-[80vh] flex-col items-center overflow-y-auto rounded-lg bg-neutral-800">
      {urls.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt={`Página ${index + 1}`} className="block h-auto w-full max-w-3xl" />
      ))}
    </div>
  );
}
