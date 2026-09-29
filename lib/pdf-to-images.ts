import { CHAPTER_MAX_PAGES } from "@/features/chapters/chapter-options";

const PAGE_WIDTH_PX = 1600;
const JPEG_QUALITY = 0.92;

// convierte cada página de un PDF en una imagen JPG, dentro del navegador
export async function pdfToImages(
  pdfFile: File,
  onProgress: (done: number, total: number) => void,
): Promise<File[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await pdfFile.arrayBuffer()) });
  const pdf = await loadingTask.promise;

  if (pdf.numPages > CHAPTER_MAX_PAGES) {
    await loadingTask.destroy();
    throw new Error(`El PDF tiene más de ${CHAPTER_MAX_PAGES} páginas.`);
  }

  const images: File[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const scale = PAGE_WIDTH_PX / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error(`No se pudo convertir la página ${pageNumber} del PDF.`);

    images.push(new File([blob], `pg-${pageNumber}.jpg`, { type: "image/jpeg" }));
    onProgress(pageNumber, pdf.numPages);
  }

  await loadingTask.destroy();
  return images;
}
