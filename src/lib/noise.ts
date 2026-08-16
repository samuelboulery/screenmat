import { mulberry32 } from './random.ts'

const TILE = 128

let cached: HTMLCanvasElement | null = null

/**
 * Tuile de bruit monochrome, générée une seule fois et réutilisée. C'est le
 * grain qui empêche le fond de ressembler à un dégradé plat : les sept captures
 * de référence en ont toutes.
 */
export function noiseTile(): HTMLCanvasElement {
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = TILE
  canvas.height = TILE

  const context = canvas.getContext('2d')
  if (!context) return canvas

  const data = context.createImageData(TILE, TILE)
  const random = mulberry32(0x5eed)

  for (let i = 0; i < data.data.length; i += 4) {
    const value = 128 + (random() - 0.5) * 255
    data.data[i] = value
    data.data[i + 1] = value
    data.data[i + 2] = value
    data.data[i + 3] = 255
  }

  context.putImageData(data, 0, 0)
  cached = canvas
  return canvas
}

/**
 * Applique le grain sur tout le canvas. Le motif est mis à l'échelle du rendu :
 * sans ça, un export 3× afficherait un grain trois fois plus fin que la preview.
 */
export function applyGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
  scale: number,
): void {
  if (amount <= 0) return

  const pattern = ctx.createPattern(noiseTile(), 'repeat')
  if (!pattern) return

  pattern.setTransform(new DOMMatrix().scale(scale))

  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = amount * 0.5
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}
