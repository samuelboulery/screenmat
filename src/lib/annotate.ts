import { frameRadius, windowPath, windowTransform } from './frame.ts'
import type { Geometry, WindowBox } from './render.ts'
import type { Annotation, AnnotationKind, FractionRect, LabelStyle, Settings } from '../types.ts'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const ACCENT = '#7DE2FF'
const ACCENT_INK = '#CFE9FF'
const STAGE = 'rgba(7, 7, 10, 0.78)'

/** Nombre de blocs sur la largeur d'une zone floutée. Constant, donc le flou est
 *  visuellement identique à l'échelle 1 et à l'échelle 3. */
const REDACTION_BLOCKS = 14
const PIXEL_BLOCKS = 8

/** Taille de police par défaut d'un callout, en fraction de la largeur du canvas. */
export const DEFAULT_LABEL_SIZE = 0.011

let counter = 0

/** Identifiant local. Pas de `crypto.randomUUID` : l'app doit tourner en
 *  contexte non sécurisé (fichier local) sans se casser. */
export function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${counter.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function createAnnotation(kind: AnnotationKind, rect: FractionRect): Annotation {
  return {
    id: nextId(kind),
    kind,
    rect,
    text: kind === 'text' ? 'Label' : '',
    labelStyle: 'pill',
    size: DEFAULT_LABEL_SIZE,
    redaction: 'blur',
  }
}

/** Rectangle en pixels du canvas. Toutes les coordonnées sont des fractions de
 *  la LARGEUR du canvas — `y` compris — pour rester homothétique à l'export. */
export function toPixels(rect: FractionRect, geometry: Geometry) {
  return {
    x: rect.x * geometry.width,
    y: rect.y * geometry.width,
    w: rect.w * geometry.width,
    h: rect.h * geometry.width,
  }
}

/** Rectangle en fractions à partir de pixels du canvas. */
export function toFractions(
  rect: { x: number; y: number; w: number; h: number },
  geometry: Geometry,
): FractionRect {
  return {
    x: rect.x / geometry.width,
    y: rect.y / geometry.width,
    w: rect.w / geometry.width,
    h: rect.h / geometry.width,
  }
}

/** L'annotation dont le rectangle contient ce point, la plus récente d'abord. */
export function hitTest(
  annotations: readonly Annotation[],
  point: { x: number; y: number },
  geometry: Geometry,
): Annotation | null {
  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    const annotation = annotations[index]
    const { x, y, w, h } = toPixels(annotation.rect, geometry)
    if (point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h) return annotation
  }
  return null
}

/**
 * Cuit les zones floutées dans les pixels, sous le clip de la fenêtre. Jamais en
 * CSS : sinon l'export ne correspondrait plus à la preview et, pire, la donnée
 * masquée resterait lisible dans le fichier.
 *
 * ponytail: le clip suit la rotation de la fenêtre, mais la zone floutée est
 * échantillonnée en espace canvas. À ±16° l'écart est invisible ; passer par un
 * rendu hors écran de la fenêtre non tournée s'il devient gênant.
 */
export function renderRedactions(
  ctx: CanvasRenderingContext2D,
  box: WindowBox,
  geometry: Geometry,
  annotations: readonly Annotation[],
  settings: Settings,
): void {
  const zones = annotations.filter((annotation) => annotation.kind === 'redaction')
  if (zones.length === 0) return

  ctx.save()
  windowTransform(ctx, box)
  windowPath(ctx, box, frameRadius(box, geometry, settings))
  ctx.clip()
  // Le chemin de clip est figé en espace écran : on redessine sans transformation.
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  for (const zone of zones) {
    const { x, y, w, h } = toPixels(zone.rect, geometry)
    if (w < 1 || h < 1) continue

    if (zone.redaction === 'solid') {
      ctx.fillStyle = '#0B0B0F'
      ctx.fillRect(x, y, w, h)
    } else {
      downsample(ctx, x, y, w, h, zone.redaction === 'pixel' ? PIXEL_BLOCKS : REDACTION_BLOCKS)
    }
  }

  ctx.restore()
}

/** Réduit puis réagrandit la zone : flou (lissé) ou mosaïque (non lissé). */
function downsample(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  blocks: number,
): void {
  const small = document.createElement('canvas')
  small.width = Math.max(1, Math.round(blocks))
  small.height = Math.max(1, Math.round((blocks * h) / w))

  const layer = small.getContext('2d')
  if (!layer) return

  layer.imageSmoothingEnabled = blocks > PIXEL_BLOCKS
  layer.drawImage(ctx.canvas, x, y, w, h, 0, 0, small.width, small.height)

  ctx.save()
  ctx.imageSmoothingEnabled = blocks > PIXEL_BLOCKS
  ctx.drawImage(small, 0, 0, small.width, small.height, x, y, w, h)
  ctx.restore()
}

/**
 * Dessine les calques non destructifs (texte, flèche, cadre) par-dessus les
 * fenêtres. Appelée par `renderScene` après `renderFrame`.
 */
export function renderAnnotations(
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  annotations: readonly Annotation[],
): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  for (const annotation of annotations) {
    const rect = toPixels(annotation.rect, geometry)
    if (annotation.kind === 'box') drawBox(ctx, rect, geometry)
    else if (annotation.kind === 'arrow') drawArrow(ctx, rect, geometry)
    else if (annotation.kind === 'text') {
      drawLabel(ctx, rect, annotation.text, annotation.labelStyle, annotation.size * geometry.width)
    }
  }

  ctx.restore()
}

type Rect = { x: number; y: number; w: number; h: number }

function drawBox(ctx: CanvasRenderingContext2D, rect: Rect, geometry: Geometry): void {
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 0.0018 * geometry.width
  ctx.beginPath()
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 0.006 * geometry.width)
  ctx.stroke()
}

function drawArrow(ctx: CanvasRenderingContext2D, rect: Rect, geometry: Geometry): void {
  const head = 0.012 * geometry.width
  const angle = Math.atan2(rect.h, rect.w)
  const tip = { x: rect.x + rect.w, y: rect.y + rect.h }

  ctx.strokeStyle = ACCENT
  ctx.fillStyle = ACCENT
  ctx.lineWidth = 0.0022 * geometry.width
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(rect.x, rect.y)
  ctx.lineTo(tip.x - Math.cos(angle) * head * 0.7, tip.y - Math.sin(angle) * head * 0.7)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(tip.x, tip.y)
  ctx.lineTo(
    tip.x - Math.cos(angle - 0.4) * head,
    tip.y - Math.sin(angle - 0.4) * head,
  )
  ctx.lineTo(
    tip.x - Math.cos(angle + 0.4) * head,
    tip.y - Math.sin(angle + 0.4) * head,
  )
  ctx.closePath()
  ctx.fill()
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  text: string,
  style: LabelStyle,
  fontSize: number,
): void {
  const label = text.trim()
  if (!label) return

  ctx.font = `${fontSize}px ${MONO}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  const padX = style === 'plain' ? 0 : fontSize * 0.8
  const padY = style === 'plain' ? 0 : fontSize * 0.55
  const width = ctx.measureText(label).width + padX * 2
  const height = fontSize + padY * 2
  const middle = rect.y + height / 2

  if (style !== 'plain') {
    ctx.fillStyle = STAGE
    ctx.beginPath()
    ctx.roundRect(rect.x, rect.y, width, height, style === 'pill' ? height / 2 : fontSize * 0.35)
    ctx.fill()
    ctx.strokeStyle = ACCENT
    ctx.lineWidth = Math.max(1, fontSize * 0.09)
    ctx.stroke()
  }

  ctx.fillStyle = style === 'plain' ? ACCENT : ACCENT_INK
  ctx.fillText(label, rect.x + padX, middle)
}
