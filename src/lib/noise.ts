import { mulberry32 } from './random.ts'

const TILE = 128

let cached: HTMLCanvasElement | null = null
let scaled: { size: number; canvas: HTMLCanvasElement } | null = null

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
 * La tuile à la taille du rendu, mise en cache pour la dernière échelle vue.
 * L'agrandissement est lissé : c'est ce que faisait le `setTransform` du motif
 * qu'elle remplace, et un agrandissement au plus proche voisin donnerait un
 * grain en blocs.
 *
 * ponytail: les bords ne s'enroulent pas, donc l'interpolation diffère d'un
 * pixel à la couture des tuiles. Sur du bruit aléatoire à 17 % d'opacité, ça ne
 * se voit pas. Agrandir une grille 3×3 et n'en garder que le centre si un jour
 * une couture apparaît.
 */
function scaledTile(scale: number): HTMLCanvasElement {
  const size = Math.max(1, Math.round(TILE * scale))
  if (scaled?.size === size) return scaled.canvas

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) return noiseTile()

  context.drawImage(noiseTile(), 0, 0, size, size)
  scaled = { size, canvas }
  return canvas
}

/**
 * Applique le grain sur tout le canvas. La tuile est mise à l'échelle du rendu :
 * sans ça, un export 3× afficherait un grain trois fois plus fin que la preview.
 *
 * Le grain se pose en tuiles blittées et non en `CanvasPattern` : à
 * 3200 × 2400 px, l'ombrage par motif coûte 470 ms là où la même tuile blittée
 * en coûte 69. Le mode de fusion, lui, n'y est pour rien — `source-over` et
 * `multiply` se mesurent au même prix que `overlay`.
 */
export function applyGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
  scale: number,
): void {
  if (amount <= 0) return

  const tile = scaledTile(scale)

  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = amount * 0.5
  for (let y = 0; y < height; y += tile.height) {
    for (let x = 0; x < width; x += tile.width) {
      ctx.drawImage(tile, x, y)
    }
  }
  ctx.restore()
}
