import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_FORMATS = ["jpeg", "png", "webp"];
const MAX_PIXELS = 50_000_000;
const WEBP_QUALITY = 90;

interface ConvertOptions {
  maxSizeMB: number;
  width?: number;
  height?: number;
}

type ConvertResult =
  | { buffer: Buffer; width: number; height: number; error?: undefined }
  | { error: string; buffer?: undefined; width?: undefined; height?: undefined };
type UploadResult = { url: string; error?: undefined } | { error: string; url?: undefined };

// revisa que el archivo sea una imagen real y la reconstruye en WebP
export async function convertToWebp(file: File, options: ConvertOptions): Promise<ConvertResult> {
  if (file.size === 0) {
    return { error: "El archivo está vacío." };
  }
  if (file.size > options.maxSizeMB * 1024 * 1024) {
    return { error: `La imagen no puede pesar más de ${options.maxSizeMB} MB.` };
  }

  const input = Buffer.from(await file.arrayBuffer());

  try {
    const image = sharp(input);
    const { format, width, height } = await image.metadata();

    if (!format || !ALLOWED_FORMATS.includes(format)) {
      return { error: "El archivo no es una imagen JPG, PNG o WEBP real." };
    }
    if (!width || !height || width * height > MAX_PIXELS) {
      return { error: "La imagen tiene dimensiones demasiado grandes." };
    }

    let pipeline = image.rotate();
    if (options.width && options.height) {
      pipeline = pipeline.resize(options.width, options.height, { fit: "cover" });
    }

    const { data, info } = await pipeline
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height };
  } catch {
    return { error: "El archivo está dañado o no es una imagen válida." };
  }
}

// sube una imagen WebP ya convertida a un bucket de Supabase y devuelve su URL pública
export async function uploadWebp(bucket: string, path: string, buffer: Buffer): Promise<UploadResult> {
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: "image/webp", upsert: true });

  if (error) {
    return { error: error.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}
