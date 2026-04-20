/**
 * Redimensionne (max 1200px côté long) et compresse en JPEG qualité 0.7.
 * Retourne un Blob image/jpeg (cible &lt; ~200 Ko quand possible).
 */
export async function compressImageForEdl(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1200;
  let { width, height } = bitmap;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.7;
  let blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
  if (!blob) throw new Error("Compression impossible");

  // Réduire un peu la qualité si trop lourd (&gt; 250 Ko)
  for (let i = 0; i < 4 && blob.size > 250 * 1024 && quality > 0.45; i++) {
    quality -= 0.08;
    blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
    if (!blob) break;
  }

  return blob!;
}
