import { css, hexToRgb, luminance, withLuminance, type Rgb } from './color.ts'
import { applyGrain } from './noise.ts'
import { saturation, withSaturation } from './palette.ts'
import { mulberry32 } from './random.ts'
import type { Palette, Settings } from '../types.ts'
import type { Geometry } from './render.ts'

/** Au-dessus, le screenshot est considéré comme clair. */
const LIGHT_THRESHOLD = 0.5

/** Luminance visée par le fond. Un screenshot clair a besoin d'un fond assez
 *  soutenu pour que la fenêtre s'en détache ; un screenshot sombre veut un fond
 *  presque noir, comme sur ovrsee.app et ViewportLab. */
const FILL_TARGET_LIGHT = 0.3
const FILL_TARGET_DARK = 0.1

export type BackgroundColors = {
  fill: Rgb
  /** Couleurs des blobs, du plus présent au moins présent. Jamais vide. */
  blobs: Rgb[]
}

/**
 * Traduit une palette extraite en couleurs de fond. C'est ici qu'on décide que
 * c'est l'accent qui colore le fond, pas la couleur dominante : sur une page
 * blanche avec un bouton violet, le fond doit être violet.
 *
 * `settings.saturation` et `settings.contrast` corrigent ce que la palette
 * impose, sans jamais toucher aux teintes : la première multiplie la saturation
 * de chaque couleur, le second écarte les taches de l'aplat — qui, lui, reste à
 * sa luminance cible, sans quoi régler le contraste reviendrait à régler la
 * clarté du fond.
 */
export function backgroundColors(palette: Palette, settings: Settings): BackgroundColors {
  const base = hexToRgb(palette.base)
  const light = luminance(base) > LIGHT_THRESHOLD
  const target = light ? FILL_TARGET_LIGHT : FILL_TARGET_DARK

  const accents = palette.accents.map(hexToRgb)
  const seed = accents[0] ?? base

  /**
   * Saturation d'abord, luminance ensuite : `withLuminance` met les trois canaux
   * à l'échelle, ce qui laisse la saturation HSV où elle est — l'inverse ne
   * serait pas vrai.
   */
  const grade = (color: Rgb, level: number): Rgb =>
    withLuminance(
      withSaturation(color, saturation(...color) * settings.saturation),
      Math.min(1, Math.max(0, target + (level - target) * settings.contrast)),
    )

  const blobs = (accents.length > 0 ? accents : [base]).map((color) =>
    grade(color, target * 1.9),
  )

  // Une tache neutre reprise du screenshot : c'est le halo clair qu'on voit dans
  // un coin sur les captures de référence.
  blobs.push(grade(base, light ? 0.55 : 0.3))
  // Et une tache sombre pour creuser le fond.
  blobs.push(grade(seed, target * 0.45))

  return { fill: grade(seed, target), blobs }
}

/** Identité d'une image de fond, sans dépendre d'un `src` lisible : le shim
 *  Node n'en expose pas de comparable. */
const imageIds = new WeakMap<object, number>()
let nextImageId = 0

function imageId(image?: HTMLImageElement): number {
  if (!image) return 0
  const known = imageIds.get(image)
  if (known !== undefined) return known
  nextImageId += 1
  imageIds.set(image, nextImageId)
  return nextImageId
}

/**
 * Tout ce dont le fond dépend, et rien d'autre. Un champ oublié ici fige le
 * fond : le réglage bouge, l'image ne suit pas. `background.test.ts` tient cette
 * liste — toute entrée ajoutée à `Settings` qui touche au fond doit s'y voir.
 */
function backgroundKey(
  geometry: Geometry,
  palette: Palette,
  settings: Settings,
  scale: number,
  image?: HTMLImageElement,
): string {
  return [
    geometry.width,
    geometry.height,
    scale,
    settings.background,
    settings.blur,
    settings.shapes,
    settings.shapeOpacity,
    settings.saturation,
    settings.contrast,
    settings.grain,
    settings.seed,
    palette.base,
    palette.accents.join(','),
    imageId(image),
  ].join('|')
}

/** Dernier fond peint. Une seule entrée : pendant un geste, c'est toujours le
 *  même fond qu'on redemande, et garder plus coûterait de la mémoire pour rien. */
let cache: { key: string; canvas: HTMLCanvasElement } | null = null

/**
 * Le fond, mis en cache d'une frame à l'autre. Il ne dépend ni des fenêtres ni
 * des calques : déplacer une annotation ou tirer une poignée ne le change pas,
 * et le repeindre à chaque frame revenait à refaire l'aplat, les taches et le
 * grain plein canvas pour rien.
 */
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  palette: Palette,
  settings: Settings,
  scale: number,
  image?: HTMLImageElement,
): void {
  const key = backgroundKey(geometry, palette, settings, scale, image)
  if (cache?.key === key) {
    ctx.drawImage(cache.canvas, 0, 0)
    return
  }

  // Le canvas se réutilise tant que la taille tient : un lot enchaîne des fonds
  // de mêmes dimensions, et réallouer à chaque item ne servirait à rien.
  const canvas =
    cache && cache.canvas.width === geometry.width && cache.canvas.height === geometry.height
      ? cache.canvas
      : document.createElement('canvas')
  canvas.width = geometry.width
  canvas.height = geometry.height

  const layer = canvas.getContext('2d')
  if (!layer) {
    paintBackground(ctx, geometry, palette, settings, scale, image)
    return
  }

  paintBackground(layer, geometry, palette, settings, scale, image)
  cache = { key, canvas }
  ctx.drawImage(canvas, 0, 0)
}

/**
 * Dessine le fond selon le preset choisi, puis le grain. Le grain est commun aux
 * quatre presets : c'est lui qui empêche un aplat de ressembler à du vide.
 */
function paintBackground(
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  palette: Palette,
  settings: Settings,
  scale: number,
  image?: HTMLImageElement,
): void {
  const { width, height } = geometry
  const colors = backgroundColors(palette, settings)

  ctx.fillStyle = css(colors.fill)
  ctx.fillRect(0, 0, width, height)

  if (settings.background === 'image' && image) {
    drawCover(ctx, width, height, image)
  } else if (settings.background === 'gradient') {
    drawGradient(ctx, width, height, colors, settings)
  } else if (settings.background === 'mesh' && settings.shapes > 0 && settings.shapeOpacity > 0) {
    drawBlobs(ctx, width, height, colors.blobs, settings)
  }
  // `solid` ne dessine rien de plus que l'aplat.

  applyGrain(ctx, width, height, settings.grain, scale)
}

/** Couvre le canvas sans déformer l'image (équivalent de `object-fit: cover`). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  image: HTMLImageElement,
): void {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const w = image.naturalWidth * scale
  const h = image.naturalHeight * scale
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h)
}

function drawGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: BackgroundColors,
  settings: Settings,
): void {
  // L'angle dépend de la graine : régénérer change le fond, ici aussi.
  const random = mulberry32(settings.seed)
  const angle = random() * Math.PI * 2
  const half = Math.hypot(width, height) / 2

  const gradient = ctx.createLinearGradient(
    width / 2 - Math.cos(angle) * half,
    height / 2 - Math.sin(angle) * half,
    width / 2 + Math.cos(angle) * half,
    height / 2 + Math.sin(angle) * half,
  )
  gradient.addColorStop(0, css(colors.blobs[0] ?? colors.fill, settings.shapeOpacity))
  gradient.addColorStop(1, css(colors.blobs[colors.blobs.length - 1] ?? colors.fill, 0))

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

/**
 * Le flou vient du rendu des blobs dans un canvas réduit d'un facteur
 * `settings.blur`, redessiné à la taille finale. C'est un flou gaussien gratuit,
 * supporté partout — `ctx.filter = 'blur()'` reste inégal selon les navigateurs
 * et coûte plus cher.
 *
 * ponytail: rééchantillonnage bilinéaire simple, pas un vrai noyau gaussien. Les
 * blobs étant déjà des dégradés radiaux, la différence ne se voit pas. Passer à
 * un blur séparable si un jour on dessine des formes à bords francs.
 */
function drawBlobs(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blobs: Rgb[],
  settings: Settings,
): void {
  const small = document.createElement('canvas')
  small.width = Math.max(2, Math.round(width / settings.blur))
  small.height = Math.max(2, Math.round(height / settings.blur))

  const layer = small.getContext('2d')
  if (!layer) return

  const random = mulberry32(settings.seed)
  const short = Math.min(small.width, small.height)

  for (let index = 0; index < settings.shapes; index += 1) {
    const color = blobs[index % blobs.length]
    const angle = random() * Math.PI * 2
    // Les blobs vivent en couronne : au centre ils passeraient sous la fenêtre.
    const distance = (0.3 + random() * 0.4) * short
    const radius = (0.35 + random() * 0.45) * short
    const squash = 0.6 + random() * 0.8
    const rotation = random() * Math.PI

    const x = small.width / 2 + Math.cos(angle) * distance
    const y = small.height / 2 + Math.sin(angle) * distance

    const gradient = layer.createRadialGradient(0, 0, 0, 0, 0, radius)
    gradient.addColorStop(0, css(color, settings.shapeOpacity))
    gradient.addColorStop(0.55, css(color, settings.shapeOpacity * 0.45))
    gradient.addColorStop(1, css(color, 0))

    layer.save()
    layer.translate(x, y)
    layer.rotate(rotation)
    layer.scale(1, squash)
    layer.fillStyle = gradient
    layer.beginPath()
    layer.arc(0, 0, radius, 0, Math.PI * 2)
    layer.fill()
    layer.restore()
  }

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(small, 0, 0, width, height)
  ctx.restore()
}
