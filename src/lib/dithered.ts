import { css, luminance, withLuminance, type Rgb } from './color.ts'
import type { BackgroundColors } from './background.ts'
import { ditherPixels } from './dither.ts'
import { PATTERNS } from './dither-patterns.ts'
import { mulberry32 } from './random.ts'
import type { Settings } from '../types.ts'

/* La série tramée : le fond `mesh`, réduit à une grille de cellules, puis rendu
   en deux tons — trame de Bayer, points de similigravure, lignes de gravure, et
   les motifs dessinés de `dither-patterns.ts`. C'est l'effet de la landing, en
   fond. La cellule est une fraction de la largeur (`ditherCell`) : même trame à
   1× et à 3×. */

/** Source unique des trames : la série, l'interface et la doc lisent cette
 *  table, dans cet ordre. `angle` dit lesquelles lisent `ditherAngle`. */
export const DITHERS = {
  bayer: { angle: false },
  halftone: { angle: true },
  scanlines: { angle: true },
  ...PATTERNS,
} as const

export type Dither = keyof typeof DITHERS

export function isDither(kind: string): kind is Dither {
  return Object.hasOwn(DITHERS, kind)
}

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
function lumaGrid(source: HTMLCanvasElement): { at: (x: number, y: number) => number; smooth: (x: number, y: number) => number } {
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
  const cell = (cx: number, cy: number) => (luma[cy * source.width + cx]! - low) / range
  const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))
  return {
    at: (x, y) => cell(clamp(Math.floor(x), source.width - 1), clamp(Math.floor(y), source.height - 1)),
    // Interpolé entre les centres des cellules : une courbe de niveau ou une
    // ligne de crête lue au plus proche voisin sortirait en escalier.
    smooth: (x, y) => {
      const fx = clamp(x - 0.5, source.width - 1)
      const fy = clamp(y - 0.5, source.height - 1)
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const x1 = Math.min(source.width - 1, x0 + 1)
      const y1 = Math.min(source.height - 1, y0 + 1)
      const tx = fx - x0
      const ty = fy - y0
      const top = cell(x0, y0) + (cell(x1, y0) - cell(x0, y0)) * tx
      const bottom = cell(x0, y1) + (cell(x1, y1) - cell(x0, y1)) * tx
      return top + (bottom - top) * ty
    },
  }
}

/**
 * Dessine la trame sur tout le canvas. `source` est le mesh rendu en petit, une
 * cellule par pixel ; sa taille donne donc celle de la trame.
 */
export function drawDithered(ctx: CanvasRenderingContext2D, width: number, height: number, colors: BackgroundColors, settings: Settings, source: HTMLCanvasElement, kind: Dither): void {
  const { light, dark } = tones(colors)
  if (kind === 'bayer') return bayer(ctx, width, height, source, light, dark)
  if (kind !== 'halftone' && kind !== 'scanlines') return pattern(ctx, width, height, colors, settings, source, kind)
  // Similigravure : des points clairs sur le ton sombre, qui grossissent avec
  // la lumière. L'inverse noyait un fond sombre sous des points jointifs.
  const [ground, ink] = kind === 'halftone' ? [dark, light] : [light, dark]
  ctx.fillStyle = css(ground)
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = css(ink)
  const luma = lumaGrid(source).at
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

/** Un motif dessiné : encre claire sur fond sombre, comme la similigravure — un
 *  fond sombre laisse la fenêtre se détacher. La seconde encre, pour les motifs
 *  qui en ont deux, est l'accent de la palette. */
function pattern(ctx: CanvasRenderingContext2D, width: number, height: number, colors: BackgroundColors, settings: Settings, source: HTMLCanvasElement, kind: keyof typeof PATTERNS): void {
  const { light, dark } = tones(colors)
  const accent = colors.blobs[0] ?? light
  const luma = lumaGrid(source).smooth
  ctx.fillStyle = css(dark)
  ctx.fillRect(0, 0, width, height)
  ctx.save()
  ctx.fillStyle = css(light)
  ctx.strokeStyle = css(light)
  PATTERNS[kind].paint(ctx, {
    width,
    height,
    cell: width / source.width,
    angle: (settings.ditherAngle * Math.PI) / 180,
    amount: (x, y) => luma((x / width) * source.width, (y / height) * source.height),
    accent: css(withLuminance(accent, Math.max(0.4, luminance(accent)))),
    ground: css(dark),
    random: mulberry32(settings.seed),
  })
  ctx.restore()
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
