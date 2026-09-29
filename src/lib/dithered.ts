import { css, luminance, withLuminance, type Rgb } from './color.ts'
import type { BackgroundColors } from './background.ts'
import { ditherPixels } from './dither.ts'
import type { Settings } from '../types.ts'

/* La série tramée : le fond `mesh`, réduit à une grille de cellules, puis rendu
   en deux tons — trame de Bayer, points de similigravure ou lignes de gravure.
   C'est l'effet de la landing, en fond. La cellule est une fraction de la
   largeur (`ditherCell`) : même trame à 1× et à 3×. */

export type Dither = 'bayer' | 'halftone' | 'scanlines'

/** Les deux tons : la teinte la plus claire et la plus sombre du fond. */
function tones(colors: BackgroundColors): { light: Rgb; dark: Rgb } {
  const sorted = [...colors.blobs, colors.fill].sort((a, b) => luminance(b) - luminance(a))
  const light = sorted[0]!
  const dark = sorted[sorted.length - 1]!
  // Deux tons trop proches ne font pas une trame : on les écarte, teintes gardées.
  return {
    light: withLuminance(light, Math.max(0.55, luminance(light))),
    dark: withLuminance(dark, Math.min(0.06, luminance(dark))),
  }
}

/** La grille de luminance : `source` porte déjà le mesh, à une cellule par pixel.
 *  Étirée de son minimum à son maximum : le mesh d'une capture sombre tient entre
 *  0 et 0,1, et la trame n'y verrait qu'un aplat. */
function lumaGrid(source: HTMLCanvasElement): (x: number, y: number) => number {
  const ctx = source.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D is unavailable')
  const { data } = ctx.getImageData(0, 0, source.width, source.height)
  const luma = new Float32Array(source.width * source.height)
  for (let i = 0; i < luma.length; i++) luma[i] = 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!
  let low = 255
  let high = 0
  for (const value of luma) {
    low = Math.min(low, value)
    high = Math.max(high, value)
  }
  const range = Math.max(1, high - low)
  return (x, y) => {
    const cx = Math.min(source.width - 1, Math.max(0, Math.floor(x)))
    const cy = Math.min(source.height - 1, Math.max(0, Math.floor(y)))
    return (luma[cy * source.width + cx]! - low) / range
  }
}

/**
 * Dessine la trame sur tout le canvas. `source` est le mesh rendu en petit, une
 * cellule par pixel ; sa taille donne donc celle de la trame.
 */
export function drawDithered(ctx: CanvasRenderingContext2D, width: number, height: number, colors: BackgroundColors, settings: Settings, source: HTMLCanvasElement, kind: Dither): void {
  const { light, dark } = tones(colors)
  if (kind === 'bayer') return bayer(ctx, width, height, source, light, dark)
  // Similigravure : des points clairs sur le ton sombre, qui grossissent avec
  // la lumière. L'inverse noyait un fond sombre sous des points jointifs.
  const [ground, ink] = kind === 'halftone' ? [dark, light] : [light, dark]
  ctx.fillStyle = css(ground)
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = css(ink)
  const luma = lumaGrid(source)
  const cell = width / source.width
  const angle = (settings.ditherAngle * Math.PI) / 180
  // Le réseau tourne autour du centre : on le parcourt en coordonnées tournées,
  // assez large pour couvrir les coins, et on relit la luminance sous chaque point.
  const reach = Math.hypot(width, height) / 2
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  // Un `fill` par forme : mesuré sous Skia, 43 000 points en un seul chemin
  // prennent 19 s (le chemin se recompose à chaque ajout), un par un 30 ms.
  for (let v = -reach; v <= reach; v += cell) {
    for (let u = -reach; u <= reach; u += cell) {
      const x = width / 2 + u * cos - v * sin
      const y = height / 2 + u * sin + v * cos
      if (x < -cell || y < -cell || x > width + cell || y > height + cell) continue
      const level = luma((x / width) * source.width, (y / height) * source.height)
      if (kind === 'halftone') dot(ctx, x, y, cell * 0.72 * Math.sqrt(level))
      else bar(ctx, x, y, cell / 2, (cell * 0.9 * (1 - level)) / 2, cos, sin)
    }
  }
}

function bayer(ctx: CanvasRenderingContext2D, width: number, height: number, source: HTMLCanvasElement, light: Rgb, dark: Rgb): void {
  const layer = source.getContext('2d', { willReadFrequently: true })
  if (!layer) throw new Error('Canvas 2D is unavailable')
  const image = layer.getImageData(0, 0, source.width, source.height)
  image.data.set(ditherPixels(image.data, source.width, source.height, light, dark))
  layer.putImageData(image, 0, 0)
  ctx.save()
  // Agrandi sans lissage : chaque cellule reste un carré net.
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, 0, 0, width, height)
  ctx.restore()
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  if (radius <= 0) return
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

/** Un segment de ligne de gravure, tourné de l'angle de la trame : demi-longueur
 *  `half`, demi-épaisseur `thick`. */
function bar(ctx: CanvasRenderingContext2D, x: number, y: number, half: number, thick: number, cos: number, sin: number): void {
  if (thick <= 0) return
  const corner = (u: number, v: number): [number, number] => [x + u * cos - v * sin, y + u * sin + v * cos]
  ctx.beginPath()
  ctx.moveTo(...corner(-half, -thick))
  ctx.lineTo(...corner(half, -thick))
  ctx.lineTo(...corner(half, thick))
  ctx.lineTo(...corner(-half, thick))
  ctx.fill()
}
