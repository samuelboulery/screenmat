import { ditherPixels, type Rgb } from '../lib/dither.ts'

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
