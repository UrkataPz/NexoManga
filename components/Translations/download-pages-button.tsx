"use client";

import { useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface DownloadPagesButtonProps {
  urls: string[];
  fileName: string;
}

// descarga todas las páginas originales del capítulo en un solo ZIP
export function DownloadPagesButton({ urls, fileName }: DownloadPagesButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // baja cada imagen, las mete al ZIP en orden y lo descarga
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      for (let index = 0; index < urls.length; index++) {
        const image = await fetch(urls[index]).then((response) => response.blob());
        zip.file(`pg-${index + 1}.webp`, image);
      }
      const zipFile = await zip.generateAsync({ type: "blob" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipFile);
      link.download = `${fileName}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      toast.error("No se pudo descargar el capítulo. Intenta de nuevo.");
    }
    setIsDownloading(false);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading} className="self-start">
      {isDownloading ? "Preparando descarga..." : "Descargar capítulo original (ZIP)"}
    </Button>
  );
}
