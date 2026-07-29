/**
 * Compresión de imágenes en el navegador usando Canvas API.
 * - Formato de salida: image/webp
 * - Calidad inicial: 0.8 (se reduce iterativamente si supera el máximo)
 * - Tamaño máximo resultante: 1 MB
 * - Dimensión máxima: 1920px (mantiene aspect ratio)
 */

const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
const MAX_DIMENSION = 1920;
const INITIAL_QUALITY = 0.8;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.1;

export interface CompressedImage {
  blob: Blob;
  /** Nombre sugerido con extensión .webp */
  fileName: string;
  originalSize: number;
  compressedSize: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen. Verifica que sea un archivo válido.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Error al comprimir la imagen.'));
      },
      'image/webp',
      quality,
    );
  });
}

/**
 * Comprime una imagen a WebP con máximo 1 MB.
 * Lanza error si el archivo no es una imagen soportada.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (JPG, PNG, WebP).');
  }

  const img = await loadImage(file);

  // Redimensionar manteniendo aspect ratio
  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible en este navegador.');

  // Fondo blanco para imágenes con transparencia (PNG → WebP)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // Comprimir con calidad decreciente hasta cumplir el tamaño máximo
  let quality = INITIAL_QUALITY;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > MAX_SIZE_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await canvasToBlob(canvas, quality);
  }

  if (blob.size > MAX_SIZE_BYTES) {
    throw new Error(
      'La imagen es demasiado grande incluso después de comprimir. Usa una foto más pequeña.',
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagen';
  return {
    blob,
    fileName: `${baseName}.webp`,
    originalSize: file.size,
    compressedSize: blob.size,
  };
}

/** Genera la URL pública de Supabase Storage para un path de bucket público. */
export function getPublicImageUrl(bucket: string, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}