export type Rgb = readonly [number, number, number]

/** Matrice de Bayer 4×4 : seize seuils répartis pour qu'aucun motif ne se voie. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/**
 * Trame 1 bit : chaque pixel devient `on` (clair) ou `off` (foncé) selon sa
 * luminance et son seuil de Bayer — la capture brute de la landing, avant son
 * « développement ». Rend un nouveau tableau, l'entrée reste intacte.
 */
export function ditherPixels(data: Uint8ClampedArray, width: number, height: number, on: Rgb, off: Rgb): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const luma = Math.pow((0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) / 255, 1.25)
      const color = luma > (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16 ? on : off
      out.set([color[0], color[1], color[2], 255], i)
    }
  }
  return out
}

/** La capture tramée à `width` pixels de large, à dessiner sans lissage. */
export function ditherImage(source: CanvasImageSource & { width: number; height: number }, width: number, on: Rgb, off: Rgb): HTMLCanvasElement {
  const height = Math.max(1, Math.round((width * source.height) / source.width))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D is unavailable')
  ctx.drawImage(source, 0, 0, width, height)
  const image = ctx.getImageData(0, 0, width, height)
  image.data.set(ditherPixels(image.data, width, height, on, off))
  ctx.putImageData(image, 0, 0)
  return canvas
}
