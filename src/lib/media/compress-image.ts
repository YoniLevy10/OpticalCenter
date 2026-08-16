/** Client-side image compress → data URL for tech evidence (no extra deps). */

export async function fileToCompressedDataUrl(
  file: File,
  opts?: { maxEdge?: number; quality?: number },
): Promise<string> {
  const maxEdge = opts?.maxEdge ?? 1280
  const quality = opts?.quality ?? 0.72

  if (!file.type.startsWith('image/')) {
    throw new Error('יש לבחור קובץ תמונה')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('לא ניתן לעבד תמונה')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  // Keep under API 320k body budget with headroom
  if (dataUrl.length > 280_000) {
    return canvas.toDataURL('image/jpeg', 0.55)
  }
  return dataUrl
}
