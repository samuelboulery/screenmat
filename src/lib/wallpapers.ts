import { css, luminance, type Rgb } from './color.ts'
import type { BackgroundColors } from './background.ts'
import type { Settings } from '../types.ts'

/* La série « macOS » : quatre fonds dessinés par le moteur, dans l'esprit des
   fonds d'écran d'Apple sans en reprendre aucun — leurs images ne se
   redistribuent pas. Tout vient de `BackgroundColors`, donc de la palette
   (capture ou retouchée), et tout se mesure en fractions de la largeur : l'export
   3× est l'homothétique du 1×. L'aléa vient de la graine, ⇧R en tire un autre. */

type Paint = (ctx: CanvasRenderingContext2D, width: number, height: number, colors: BackgroundColors, settings: Settings, random: () => number) => void

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const shade = (color: Rgb, k: number): Rgb => [color[0] * k, color[1] * k, color[2] * k]

/** Les teintes du fond, de la plus claire à la plus sombre. Les deux dernières
 *  taches de `backgroundColors` sont un halo neutre et un creux sombre : sans
 *  accent, on les garde ; avec, elles terniraient ces fonds-ci. */
function ramp(colors: BackgroundColors): Rgb[] {
  const accents = colors.blobs.length > 2 ? colors.blobs.slice(0, -2) : colors.blobs
  return [...accents, colors.fill].sort((a, b) => luminance(b) - luminance(a))
}

function verticalWash(ctx: CanvasRenderingContext2D, width: number, height: number, top: Rgb, bottom: Rgb) {
  const wash = ctx.createLinearGradient(0, 0, 0, height)
  wash.addColorStop(0, css(top))
  wash.addColorStop(1, css(bottom))
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, width, height)
}

/** Esprit Sonoma : des bandes ondulées superposées, plus sombres vers le bas. */
const waves: Paint = (ctx, width, height, colors, settings, random) => {
  const tones = ramp(colors)
  verticalWash(ctx, width, height, tones[0]!, colors.fill)
  const bands = 5
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1)
    const y = height * (0.3 + t * 0.55)
    const amplitude = width * (0.03 + random() * 0.05)
    const phase = random()
    const top = mix(tones[Math.min(i, tones.length - 1)]!, colors.fill, t * 0.6)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(width * (0.25 + phase * 0.1), y - amplitude, width * (0.6 - phase * 0.1), y + amplitude, width, y - amplitude * 0.4)
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    const fill = ctx.createLinearGradient(0, y - amplitude, 0, height)
    fill.addColorStop(0, css(top, 0.6 + 0.4 * settings.shapeOpacity))
    fill.addColorStop(1, css(shade(top, 0.55), 0.6 + 0.4 * settings.shapeOpacity))
    ctx.fillStyle = fill
    ctx.fill()
    // Un liseré clair sur la crête, comme la lumière qui accroche une vague.
    ctx.strokeStyle = css([255, 255, 255], 0.08)
    ctx.lineWidth = width * 0.0015
    ctx.stroke()
  }
}

/** Esprit Ventura : des collines rondes qui se recouvrent, sous un halo. */
const dunes: Paint = (ctx, width, height, colors, settings, random) => {
  const tones = ramp(colors)
  verticalWash(ctx, width, height, tones[0]!, mix(tones[0]!, colors.fill, 0.5))
  const halo = ctx.createRadialGradient(width * (0.3 + random() * 0.4), height * 0.25, 0, width * 0.5, height * 0.25, width * 0.6)
  halo.addColorStop(0, css(tones[0]!, 0.7 * settings.shapeOpacity))
  halo.addColorStop(1, css(tones[0]!, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, width, height)

  const layers = 4
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1)
    const base = height * (0.45 + t * 0.2)
    const peak = random()
    // Du fond vers l'avant : de la teinte claire, voilée par la distance, à la
    // plus sombre.
    const color = shade(mix(tones[0]!, tones[Math.min(i + 1, tones.length - 1)]!, 0.4 + t * 0.6), 1 - t * 0.3)
    ctx.beginPath()
    ctx.moveTo(-width * 0.1, height)
    ctx.lineTo(-width * 0.1, base + width * 0.05)
    ctx.quadraticCurveTo(width * (0.2 + peak * 0.5), base - width * (0.12 + random() * 0.08), width * 1.1, base + width * 0.04 * (random() - 0.5))
    ctx.lineTo(width * 1.1, height)
    ctx.closePath()
    const fill = ctx.createLinearGradient(0, base - width * 0.15, 0, height)
    fill.addColorStop(0, css(color))
    fill.addColorStop(1, css(shade(color, 0.7)))
    ctx.fillStyle = fill
    ctx.fill()
  }
}

/** Esprit Monterey : des voiles lumineux flous sur un fond profond. Flou par
 *  réduction puis agrandissement, jamais `ctx.filter` (support inégal). */
const aurora: Paint = (ctx, width, height, colors, settings, random) => {
  const tones = ramp(colors)
  verticalWash(ctx, width, height, shade(colors.fill, 0.7), shade(colors.fill, 0.35))
  const small = document.createElement('canvas')
  small.width = Math.max(8, Math.round(width / 12))
  small.height = Math.max(8, Math.round(height / 12))
  const layer = small.getContext('2d')
  if (!layer) throw new Error('Canvas 2D is unavailable')
  // Les voiles s'additionnent comme de la lumière : là où deux se croisent,
  // le ciel s'éclaire au lieu de se salir.
  layer.globalCompositeOperation = 'lighter'
  const curtains = 6
  for (let i = 0; i < curtains; i++) {
    const color = tones[i % tones.length]!
    const x = small.width * (0.08 + random() * 0.84)
    const radius = small.width * (0.14 + random() * 0.1)
    const glow = layer.createRadialGradient(0, 0, 0, 0, 0, radius)
    glow.addColorStop(0, css(color, settings.shapeOpacity))
    glow.addColorStop(1, css(color, 0))
    layer.save()
    layer.translate(x, small.height * (0.3 + random() * 0.3))
    layer.rotate((random() - 0.5) * 0.6)
    layer.scale(1, 3.2)
    layer.fillStyle = glow
    layer.beginPath()
    layer.arc(0, 0, radius, 0, Math.PI * 2)
    layer.fill()
    layer.restore()
  }
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(small, 0, 0, width, height)
  ctx.restore()
}

/** Esprit Big Sur : de larges rubans ondulés en diagonale, ombrés entre eux. */
const ribbons: Paint = (ctx, width, height, colors, settings, random) => {
  const tones = ramp(colors)
  verticalWash(ctx, width, height, colors.fill, shade(colors.fill, 0.6))
  const count = 3
  for (let i = 0; i < count; i++) {
    const offset = height * (0.15 + i * 0.3 + (random() - 0.5) * 0.1)
    const thickness = width * (0.1 + random() * 0.06)
    const sway = width * (0.05 + random() * 0.05)
    const edge = (y: number, dir: 1 | -1) => {
      if (dir === 1) {
        ctx.moveTo(-width * 0.1, y + width * 0.25)
        ctx.bezierCurveTo(width * 0.3, y + sway, width * 0.6, y - sway, width * 1.1, y - width * 0.25)
      } else {
        ctx.lineTo(width * 1.1, y - width * 0.25)
        ctx.bezierCurveTo(width * 0.6, y - sway, width * 0.3, y + sway, -width * 0.1, y + width * 0.25)
      }
    }
    ctx.save()
    ctx.shadowColor = css([0, 0, 0], 0.35)
    ctx.shadowBlur = width * 0.03
    ctx.shadowOffsetY = width * 0.008
    ctx.beginPath()
    edge(offset, 1)
    edge(offset + thickness, -1)
    ctx.closePath()
    const fill = ctx.createLinearGradient(0, height, width, 0)
    fill.addColorStop(0, css(tones[i % tones.length]!, 0.7 + 0.3 * settings.shapeOpacity))
    fill.addColorStop(1, css(tones[(i + 1) % tones.length]!, 0.7 + 0.3 * settings.shapeOpacity))
    ctx.fillStyle = fill
    ctx.fill()
    ctx.restore()
  }
}

export const WALLPAPERS = { waves, dunes, aurora, ribbons } as const
export type Wallpaper = keyof typeof WALLPAPERS
