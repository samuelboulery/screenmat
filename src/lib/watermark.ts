import type { Watermark, WatermarkPosition } from '../types.ts'
import type { Geometry } from './render.ts'

/** Marge du watermark au bord du canvas, en fraction de la largeur du canvas. */
const INSET = 0.0175

export const WATERMARK_POSITIONS: readonly WatermarkPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

/**
 * Pose le logo de l'utilisateur sur le rendu. C'est le seul élément du visuel
 * qui ne vient ni du screenshot ni de la palette — il est donc dessiné en
 * dernier, au-dessus de tout.
 */
export function renderWatermark(
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  image: HTMLImageElement,
  mark: Watermark,
): void {
  if (mark.opacity <= 0 || mark.size <= 0) return
  if (image.naturalWidth === 0 || image.naturalHeight === 0) return

  const width = mark.size * geometry.width
  const height = (width * image.naturalHeight) / image.naturalWidth
  const inset = INSET * geometry.width

  const [vertical, horizontal] = mark.position.split('-') as ['top' | 'bottom', string]
  const x =
    horizontal === 'left'
      ? inset
      : horizontal === 'right'
        ? geometry.width - width - inset
        : (geometry.width - width) / 2
  const y = vertical === 'top' ? inset : geometry.height - height - inset

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = mark.opacity
  ctx.drawImage(image, x, y, width, height)
  ctx.restore()
}
