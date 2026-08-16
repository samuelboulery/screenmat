import { renderAnnotations, renderRedactions } from './layers.ts'
import { renderBackground } from './background.ts'
import { renderFrame, windowTransform } from './frame.ts'
import { renderWatermark } from './watermark.ts'
import { flatten } from './tree.ts'
import {
  DEFAULT_COMPOSITION,
  type Annotation,
  type Composition,
  type Ratio,
  type Scene,
  type Settings,
  type Shot,
} from '../types.ts'

/** Les calques d'un shot qui se dessinent. Un calque masqué disparaît du rendu,
 *  donc du fichier exporté : c'est la même fonction pour la preview et l'export. */
function visible(shot: Shot): Annotation[] {
  return flatten(shot.layers, { skipHidden: true })
}

/** Largeur de référence à l'échelle 1. Les exports 2× et 3× la multiplient. */
export const BASE_WIDTH = 1600

/** Hauteur de la barre de titre, en fraction de la largeur de la fenêtre.
 *  Mesuré sur les captures de référence : 48 px pour une fenêtre de 1382 px. */
export const TITLE_BAR = 0.035

/** Cisaillement vertical simulant la rotation Y. Voir `windowTransform`. */
const SKEW = 0.3

const RATIOS: Record<Exclude<Ratio, 'auto'>, number> = {
  '4:3': 4 / 3,
  '1:1': 1,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
}

export type WindowBox = {
  x: number
  y: number
  width: number
  height: number
  /** Rotation autour de l'axe Y, en degrés. 0 pour une fenêtre de face. */
  rotateY: number
  /** Index du shot dessiné dans cette fenêtre. */
  shot: number
}

export type Geometry = {
  width: number
  height: number
  /** Fenêtre principale — barre de titre incluse. Toujours `windows[0]`
   *  logiquement, mais `windows` est trié pour le dessin (arrière → avant). */
  window: WindowBox
  /** Toutes les fenêtres, dans l'ordre de dessin. */
  windows: WindowBox[]
  /** Hauteur de la barre de titre en px, 0 si masquée. */
  titleBar: number
  radius: number
}

/** Position d'une fenêtre en unités de largeur de fenêtre, centre à l'origine. */
type Offset = { dx: number; dy: number; rotateY: number; shot: number }

/**
 * Dispose `count` fenêtres selon la composition, en unités de largeur de
 * fenêtre. Résultat trié de l'arrière vers l'avant : c'est l'ordre de dessin.
 */
function layoutOffsets(count: number, composition: Composition): Offset[] {
  const { layout, spread, converge, elevation } = composition
  const n = Math.max(1, count)

  if (layout === 'single' || n === 1) {
    return [{ dx: 0, dy: 0, rotateY: 0, shot: 0 }]
  }

  if (layout === 'stack') {
    // Un jeu de cartes : la fenêtre active devant, les autres décalées derrière.
    const step = 0.04 + 0.1 * spread
    const offsets: Offset[] = []
    for (let index = n - 1; index >= 0; index -= 1) {
      offsets.push({
        dx: -index * step,
        dy: -index * elevation,
        rotateY: 0,
        shot: index,
      })
    }
    return offsets
  }

  if (layout === 'side') {
    const gap = 1 + 0.04 + 0.2 * spread
    return Array.from({ length: n }, (_, index) => ({
      dx: (index - (n - 1) / 2) * gap,
      dy: 0,
      rotateY: 0,
      shot: index,
    }))
  }

  // tilt3d : les fenêtres convergent vers le centre et se chevauchent.
  const gap = 0.5 + 0.55 * spread
  return Array.from({ length: n }, (_, index) => {
    const position = index - (n - 1) / 2
    return {
      dx: position * gap,
      dy: (index % 2 === 0 ? -1 : 1) * (elevation / 2),
      // La fenêtre de gauche tourne vers la droite, et réciproquement.
      rotateY: -Math.sign(position) * converge,
      shot: index,
    }
  })
}

/** Encombrement de la disposition, en unités de largeur de fenêtre. */
function extent(offsets: Offset[], aspect: number): { width: number; height: number } {
  let left = Infinity
  let right = -Infinity
  let top = Infinity
  let bottom = -Infinity

  for (const { dx, dy, rotateY } of offsets) {
    const radians = (rotateY * Math.PI) / 180
    const halfWidth = Math.abs(Math.cos(radians)) / 2
    // Le cisaillement pousse les coins hors de la boîte droite.
    const halfHeight = aspect / 2 + Math.abs(Math.sin(radians)) * SKEW * halfWidth
    left = Math.min(left, dx - halfWidth)
    right = Math.max(right, dx + halfWidth)
    top = Math.min(top, dy - halfHeight)
    bottom = Math.max(bottom, dy + halfHeight)
  }

  return { width: right - left, height: bottom - top }
}

/**
 * Toute la géométrie du rendu, en pixels, pour une échelle donnée. Fonction
 * pure : c'est elle qui garantit que l'export est l'homothétique exact de la
 * preview, et c'est elle qui est testée.
 */
export function computeGeometry(
  imageWidth: number,
  imageHeight: number,
  settings: Settings,
  scale = 1,
  composition: Composition = DEFAULT_COMPOSITION,
  shots = 1,
): Geometry {
  const width = Math.max(1, Math.round(BASE_WIDTH * scale))
  const bar = settings.titleBar && settings.frame === 'browser' ? TITLE_BAR : 0

  // Rapport hauteur/largeur d'une fenêtre : l'image, plus la barre de titre qui
  // est elle-même exprimée en fraction de la largeur de la fenêtre.
  const aspect = imageHeight / imageWidth + bar
  const offsets = layoutOffsets(shots, composition)
  const spanned = extent(offsets, aspect)
  const pad = settings.padding * width

  const place = (canvasWidth: number, canvasHeight: number, windowWidth: number): Geometry => {
    const windowHeight = windowWidth * aspect
    const boxes = offsets.map<WindowBox>((offset) => ({
      x: canvasWidth / 2 + offset.dx * windowWidth - windowWidth / 2,
      y: canvasHeight / 2 + offset.dy * windowWidth - windowHeight / 2,
      width: windowWidth,
      height: windowHeight,
      rotateY: offset.rotateY + settings.rotateY,
      shot: offset.shot,
    }))
    const primary = boxes.find((box) => box.shot === 0) ?? boxes[0]

    return {
      width: canvasWidth,
      height: canvasHeight,
      window: primary,
      windows: boxes,
      titleBar: bar * windowWidth,
      radius: settings.radius * windowWidth,
    }
  }

  if (settings.ratio === 'auto') {
    const windowWidth = Math.max(1, (width - 2 * pad) / spanned.width)
    const height = Math.round(windowWidth * spanned.height + 2 * pad)
    return place(width, Math.max(1, height), windowWidth)
  }

  const height = Math.max(1, Math.round(width / RATIOS[settings.ratio]))
  const boxWidth = Math.max(1, width - 2 * pad)
  const boxHeight = Math.max(1, height - 2 * pad)

  // Contain : la composition entière tient dans la boîte, centrée.
  const windowWidth = Math.max(
    1,
    Math.min(boxWidth / spanned.width, boxHeight / spanned.height),
  )

  return place(width, height, windowWidth)
}

/**
 * LE seul chemin de rendu. La preview l'appelle avec l'échelle de l'écran,
 * l'export avec 1, 2 ou 3. Redimensionne le canvas qu'on lui passe.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  scale: number,
): Geometry {
  const { shots, palette, settings, composition } = scene
  const first = shots[0]
  if (!first) throw new Error('Scène sans screenshot')

  const geometry = computeGeometry(
    first.image.naturalWidth,
    first.image.naturalHeight,
    settings,
    scale,
    composition,
    shots.length,
  )

  ctx.canvas.width = geometry.width
  ctx.canvas.height = geometry.height
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, geometry.width, geometry.height)

  renderBackground(ctx, geometry, palette, settings, scale, scene.backgroundImage)

  for (const box of geometry.windows) {
    const shot = shots[box.shot] ?? first
    ctx.save()
    windowTransform(ctx, box)
    renderFrame(ctx, box, geometry, shot.image, shot.palette, settings)
    ctx.restore()
    // Le floutage est cuit dans les pixels, sous le clip de la fenêtre : la
    // donnée masquée ne se retrouve jamais dans le fichier exporté.
    renderRedactions(ctx, box, geometry, visible(shot), settings)
  }

  // Les calques non destructifs passent après toutes les fenêtres : en
  // multi-shot, une annotation n'est jamais recouverte par la fenêtre voisine.
  for (const box of geometry.windows) {
    renderAnnotations(ctx, box, visible(shots[box.shot] ?? first), scene.editing)
  }

  if (scene.watermark) {
    renderWatermark(ctx, geometry, scene.watermark.image, scene.watermark.mark)
  }

  return geometry
}
