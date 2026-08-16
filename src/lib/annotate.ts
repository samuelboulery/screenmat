import type { WindowBox } from './render.ts'
import type { Annotation, AnnotationKind, FractionRect } from '../types.ts'

/* Modèle et géométrie des calques. Le dessin vit dans `layers.ts` : ici, rien
   qui touche à un contexte canvas — tout est testable sans navigateur. */

/** Accent de la DA, couleur par défaut d'un calque. */
export const ANNOTATION_ACCENT = '#7DE2FF'

/** Taille de police par défaut d'un callout, en fraction de la largeur de la
 *  fenêtre. */
export const DEFAULT_LABEL_SIZE = 0.011

/** Avance d'un caractère en police monospace, en fraction de la taille de
 *  police. Sert à estimer la largeur d'un label sans contexte canvas.
 *
 *  ponytail: le dessin, lui, mesure exactement (`ctx.measureText`) — cette
 *  estimation ne sert qu'au hit-test et au cadre de sélection, où quelques
 *  pixels d'écart ne se voient pas. Remonter la mesure du rendu si ça devient
 *  gênant. */
const MONO_ADVANCE = 0.6

/** Valeurs de départ d'un calque. Toutes les tailles sont des fractions de la
 *  largeur de la fenêtre. */
export const ANNOTATION_DEFAULTS = {
  color: ANNOTATION_ACCENT,
  strokeWidth: 0.0022,
  radius: 0.006,
  arrowHead: 0.012,
  fill: 0,
  opacity: 1,
} as const

/** Bornes des réglages, partagées par l'inspecteur et les tests. */
export const ANNOTATION_LIMITS = {
  size: { min: 0.005, max: 0.04, step: 0.001 },
  strokeWidth: { min: 0.0005, max: 0.012, step: 0.0005 },
  radius: { min: 0, max: 0.06, step: 0.002 },
  arrowHead: { min: 0.004, max: 0.04, step: 0.001 },
  fill: { min: 0, max: 1, step: 0.05 },
  opacity: { min: 0.1, max: 1, step: 0.05 },
} as const

/** Formes qui se tracent d'un point à un autre : leur rect garde son signe. */
export function isSegment(kind: AnnotationKind): boolean {
  return kind === 'arrow' || kind === 'line'
}

/** Formes posées d'un clic, sans glisser : leur taille vient de `size`. */
export function isPoint(kind: AnnotationKind): boolean {
  return kind === 'badge'
}

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
    ...ANNOTATION_DEFAULTS,
  }
}

export type Rect = { x: number; y: number; w: number; h: number }

/** Rectangle en pixels du canvas, avant la rotation de la fenêtre. Les
 *  coordonnées sont relatives à la fenêtre : `x = 0` est son bord gauche. */
export function toPixels(rect: FractionRect, box: WindowBox): Rect {
  return {
    x: box.x + rect.x * box.width,
    y: box.y + rect.y * box.width,
    w: rect.w * box.width,
    h: rect.h * box.width,
  }
}

/** Rectangle en fractions de la largeur de la fenêtre, à partir de pixels. */
export function toFractions(rect: Rect, box: WindowBox): FractionRect {
  return {
    x: (rect.x - box.x) / box.width,
    y: (rect.y - box.y) / box.width,
    w: rect.w / box.width,
    h: rect.h / box.width,
  }
}

/** Longueur en pixels d'une fraction de la largeur de la fenêtre. */
export function toLength(fraction: number, box: WindowBox): number {
  return fraction * box.width
}

/** Rectangle à `w`/`h` positifs, quel que soit le sens du tracé. */
export function normalizeRect(rect: Rect): Rect {
  return {
    x: rect.w < 0 ? rect.x + rect.w : rect.x,
    y: rect.h < 0 ? rect.y + rect.h : rect.y,
    w: Math.abs(rect.w),
    h: Math.abs(rect.h),
  }
}

/** Numéro affiché par chaque badge : son rang parmi les badges du shot.
 *  Rien n'est stocké, donc supprimer le badge 2 renumérote les suivants. */
export function badgeNumbers(annotations: readonly Annotation[]): Map<string, number> {
  const numbers = new Map<string, number>()
  let rank = 0
  for (const annotation of annotations) {
    if (annotation.kind !== 'badge') continue
    rank += 1
    numbers.set(annotation.id, rank)
  }
  return numbers
}

/** Rayon d'un badge en pixels. Le rect ne porte que son ancre. */
export function badgeRadius(annotation: Annotation, box: WindowBox): number {
  return toLength(annotation.size, box) * 1.05
}

/** Dimensions de la pastille d'un label, en pixels. */
export function labelSize(annotation: Annotation, box: WindowBox): Rect {
  const fontSize = toLength(annotation.size, box)
  const padX = annotation.labelStyle === 'plain' ? 0 : fontSize * 0.8
  const padY = annotation.labelStyle === 'plain' ? 0 : fontSize * 0.55
  const text = annotation.text.trim()

  return {
    x: 0,
    y: 0,
    w: text.length * fontSize * MONO_ADVANCE + padX * 2,
    h: fontSize + padY * 2,
  }
}

/**
 * Bornes réellement occupées par un calque, en pixels du canvas et avant la
 * rotation de la fenêtre. Source unique : le hit-test et le cadre de sélection
 * l'utilisent tous les deux, sinon on clique à côté de ce qu'on voit.
 */
export function bounds(annotation: Annotation, box: WindowBox): Rect {
  const rect = toPixels(annotation.rect, box)

  if (annotation.kind === 'badge') {
    const radius = badgeRadius(annotation, box)
    return { x: rect.x, y: rect.y, w: radius * 2, h: radius * 2 }
  }

  if (annotation.kind === 'text') {
    const size = labelSize(annotation, box)
    return { x: rect.x, y: rect.y, w: size.w, h: size.h }
  }

  const normalized = normalizeRect(rect)
  if (!isSegment(annotation.kind)) return normalized

  // Une flèche déborde de son segment par sa tête et son trait.
  const margin =
    Math.max(
      toLength(annotation.strokeWidth, box),
      annotation.kind === 'arrow' ? toLength(annotation.arrowHead, box) : 0,
    ) / 2

  return {
    x: normalized.x - margin,
    y: normalized.y - margin,
    w: normalized.w + margin * 2,
    h: normalized.h + margin * 2,
  }
}

/** Distance d'un point au segment [a, b]. */
function distanceToSegment(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y)

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

/** Tolérance de clic autour d'un trait fin, en pixels du canvas. */
const HIT_SLOP = 6

export function hits(annotation: Annotation, point: { x: number; y: number }, box: WindowBox): boolean {
  if (isSegment(annotation.kind)) {
    // Une flèche diagonale a un AABB immense : viser le trait, pas la boîte.
    const rect = toPixels(annotation.rect, box)
    const reach = Math.max(HIT_SLOP, toLength(annotation.strokeWidth, box) * 2)
    return (
      distanceToSegment(
        point,
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.w, y: rect.y + rect.h },
      ) <= reach
    )
  }

  const area = bounds(annotation, box)
  return (
    point.x >= area.x &&
    point.x <= area.x + area.w &&
    point.y >= area.y &&
    point.y <= area.y + area.h
  )
}

/** Le calque sous ce point, le plus récent d'abord. */
export function hitTest(
  annotations: readonly Annotation[],
  point: { x: number; y: number },
  box: WindowBox,
): Annotation | null {
  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    if (hits(annotations[index], point, box)) return annotations[index]
  }
  return null
}
