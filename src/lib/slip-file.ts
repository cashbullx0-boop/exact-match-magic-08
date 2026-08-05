/**
 * Payment-slip file helpers.
 *
 * Phone cameras frequently hand us files with an empty/odd MIME type
 * (HEIC, application/octet-stream) and 6–12MB photos. Both used to be
 * rejected outright, which is what users saw as "slip upload not working".
 */

const IMAGE_EXTS = [
  "jpg", "jpeg", "jfif", "png", "webp", "gif", "avif",
  "heic", "heif", "bmp", "tif", "tiff",
];

export const MAX_SLIP_BYTES = 25 * 1024 * 1024; // hard limit before compression
const COMPRESS_OVER_BYTES = 2 * 1024 * 1024; // compress anything bigger
const MAX_DIMENSION = 1800;

export function fileExt(name: string): string {
  const raw = name.split(".").pop() ?? "";
  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean.length > 0 && clean.length <= 5 ? clean : "jpg";
}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || fileExt(file.name) === "pdf";
}

export function isAcceptedSlip(file: File): boolean {
  if (!file || file.size <= 0) return false;
  if (file.type.startsWith("image/")) return true;
  if (isPdf(file)) return true;
  // Empty or generic MIME → fall back to the extension.
  if (IMAGE_EXTS.includes(fileExt(file.name))) return true;
  // Some phones/file managers hand over an unknown MIME *and* an unusual
  // extension for a perfectly valid screenshot. Never block the deposit for
  // that — accept the file and let the admin review it.
  return true;
}

export function canPreview(file: File): boolean {
  return file.type.startsWith("image/") && !/heic|heif/.test(file.type);
}

/**
 * Downscales + re-encodes large images to JPEG so big phone photos upload
 * reliably. Returns the original file when compression isn't possible
 * (PDFs, unsupported codecs like HEIC on some browsers, or small files).
 */
export async function compressSlipIfNeeded(file: File): Promise<File> {
  if (isPdf(file)) return file;
  if (file.size <= COMPRESS_OVER_BYTES) return file;
  if (typeof document === "undefined") return file;

  try {
    const bitmap = await loadBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "slip";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}