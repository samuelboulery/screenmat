import { hexToRgb, luminance, withLuminance, type Rgb } from './color.ts'
import type { Palette } from '../types.ts'

/** 64×64 : assez fin pour attraper un accent minoritaire (un bouton, un lien),
 *  assez grossier pour rester instantané. En 16×16 le violet de pelote.pages.dev
 *  disparaissait sous le blanc de la page. */
const SAMPLE = 64

/** En dessous, la couleur est délavée — pas un accent. */
const MIN_SATURATION = 0.15

/**
 * Écart absolu entre le canal le plus fort et le plus faible. Indispensable en
 * plus de la saturation : celle-ci est un rapport, donc un gris sombre comme
 * rgb(40,46,52) affiche 0,23 de saturation pour 12 points d'écart. Sans ce
 * seuil, les chromes des screenshots sombres passaient pour des accents et
 * reléguaient le vrai vert de ViewportLab en troisième position.
 */
const MIN_CHROMA = 36

/** Un pixel coloré mais quasi noir ne colore rien. */
const MIN_VALUE = 0.12

const HUE_BUCKETS = 12

const MAX_ACCENTS = 4

/** Deux bacs de teinte voisins peuvent rendre la même couleur à un point près
 *  (accessipote sortait `#688098` et `#688097`). Écart minimal, par canal, pour
 *  qu'un accent compte comme nouveau. */
const MIN_ACCENT_DISTANCE = 24

/** Repli quand l'image n'a aucun pixel opaque exploitable. */
const FALLBACK_BASE = '#16191c'

type Bin = { count: number; r: number; g: number; b: number; saturation: number }

function channelToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
}

export function toHex(r: number, g: number, b: number): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`
}

export function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  if (max === 0) return 0
  return (max - min) / max
}

export function hue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0

  const delta = max - min
  let value: number

  if (max === r) value = ((g - b) / delta) % 6
  else if (max === g) value = (b - r) / delta + 2
  else value = (r - g) / delta + 4

  return (value * 60 + 360) % 360
}

function add(bins: Map<number, Bin>, key: number, r: number, g: number, b: number, s: number): void {
  const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0, saturation: 0 }
  bins.set(key, {
    count: bin.count + 1,
    r: bin.r + r,
    g: bin.g + g,
    b: bin.b + b,
    saturation: bin.saturation + s,
  })
}

function average(bin: Bin): [number, number, number] {
  return [bin.r / bin.count, bin.g / bin.count, bin.b / bin.count]
}

function far(a: [number, number, number], b: [number, number, number]): boolean {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) >= MIN_ACCENT_DISTANCE
}

/**
 * Deux passes sur les mêmes pixels :
 *
 * - `base` — quantification RGB grossière (4 niveaux par canal) toutes teintes
 *   confondues. C'est presque toujours le fond de la page.
 * - `accents` — uniquement les pixels franchement colorés, groupés par teinte,
 *   triés par `population × saturation`. Le produit est ce qui fait remonter une
 *   couleur vive minoritaire devant un aplat immense à peine teinté : c'est le
 *   violet d'un bouton qui doit colorer le fond, pas le blanc de la page.
 *
 * Fonction pure : c'est elle qui est testée, pas le canvas.
 */
export function quantize(pixels: Uint8ClampedArray | readonly number[]): Palette {
  const hues = new Map<number, Bin>()
  const rgb = new Map<number, Bin>()

  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const r = pixels[index]
    const g = pixels[index + 1]
    const b = pixels[index + 2]
    if (pixels[index + 3] < 128) continue

    const s = saturation(r, g, b)
    add(rgb, ((r >> 6) << 4) | ((g >> 6) << 2) | (b >> 6), r, g, b, s)

    if (s < MIN_SATURATION) continue
    if (Math.max(r, g, b) - Math.min(r, g, b) < MIN_CHROMA) continue
    if (Math.max(r, g, b) / 255 < MIN_VALUE) continue
    add(hues, Math.floor(hue(r, g, b) / (360 / HUE_BUCKETS)), r, g, b, s)
  }

  const dominant = [...rgb.values()].sort((a, b) => b.count - a.count)[0]

  const accents: Array<[number, number, number]> = []
  for (const bin of [...hues.values()].sort((a, b) => b.count * b.saturation - a.count * a.saturation)) {
    if (accents.length === MAX_ACCENTS) break
    const color = average(bin)
    if (accents.every((kept) => far(kept, color))) accents.push(color)
  }

  return {
    base: dominant ? toHex(...average(dominant)) : FALLBACK_BASE,
    accents: accents.map((color) => toHex(...color)),
  }
}

/** Ce qu'un lot met en commun : l'intensité, jamais la teinte. */
type Intensity = { saturation: number; luminance: number }

/**
 * Ramène une couleur à une saturation cible en gardant sa teinte : le canal le
 * plus fort ne bouge pas, les deux autres se rapprochent ou s'écartent de lui.
 * La teinte ne dépend que du rapport des écarts entre canaux, que ce facteur
 * unique préserve.
 */
export function withSaturation(color: Rgb, target: number): Rgb {
  const current = saturation(...color)
  // Un gris n'a pas de teinte à préserver : le saturer inventerait une couleur.
  if (current === 0) return color

  const max = Math.max(...color)
  const factor = target / current
  return [
    Math.max(0, max - (max - color[0]) * factor),
    Math.max(0, max - (max - color[1]) * factor),
    Math.max(0, max - (max - color[2]) * factor),
  ]
}

function meanIntensity(colors: readonly Rgb[]): Intensity | null {
  if (colors.length === 0) return null
  const total = colors.reduce(
    (sum, color) => ({
      saturation: sum.saturation + saturation(...color),
      luminance: sum.luminance + luminance(color),
    }),
    { saturation: 0, luminance: 0 },
  )
  return {
    saturation: total.saturation / colors.length,
    luminance: total.luminance / colors.length,
  }
}

function align(hex: string, target: Intensity | null): string {
  if (!target) return hex
  // Saturation d'abord : `withLuminance` est une mise à l'échelle des trois
  // canaux, elle laisse la saturation HSV où elle est.
  return toHex(...withLuminance(withSaturation(hexToRgb(hex), target.saturation), target.luminance))
}

/**
 * Aligne un lot de palettes sur la saturation et la luminance moyennes du lot,
 * chaque couleur gardant sa teinte. Deux captures d'un même produit — l'une
 * pâle, l'autre très colorée — donnent alors des fonds de même intensité au lieu
 * de deux ambiances étrangères l'une à l'autre.
 *
 * `base` et `accents` ont leur propre cible : moyenner un fond de page avec un
 * bouton vif tirerait les deux vers un entre-deux terne.
 */
export function harmonizePalettes(palettes: readonly Palette[]): Palette[] {
  const base = meanIntensity(palettes.map((palette) => hexToRgb(palette.base)))
  const accent = meanIntensity(palettes.flatMap((palette) => palette.accents.map(hexToRgb)))

  return palettes.map((palette) => ({
    base: align(palette.base, base),
    accents: palette.accents.map((color) => align(color, accent)),
  }))
}

/**
 * Extrait la palette d'une image déjà chargée. Tout se passe dans le
 * navigateur : aucun octet ne part sur le réseau.
 */
export function extractPalette(image: HTMLImageElement): Palette {
  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE
  canvas.height = SAMPLE

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return { base: FALLBACK_BASE, accents: [] }

  context.drawImage(image, 0, 0, SAMPLE, SAMPLE)
  return quantize(context.getImageData(0, 0, SAMPLE, SAMPLE).data)
}
