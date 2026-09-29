import { ANNOTATION_LIMITS, isPoint, isSegment, type Point } from './annotate.ts'
import { clamp } from './parse.ts'
import type { WindowBox } from './render.ts'
import { layoutText, measureText, type Measure } from './text.ts'
import type { Annotation, AnnotationKind, FractionRect } from '../types.ts'

/* Géométrie des poignées de sélection. Logique pure : les poignées elles-mêmes
   sont en DOM (`SelectionOverlay`) et ne sortent jamais dans l'export. */

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'start' | 'end'

const AREA_HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const SEGMENT_HANDLES: readonly Handle[] = ['start', 'end']
/** Un texte : ses bords règlent la largeur de retour à la ligne, son coin la
 *  taille de police. */
const TEXT_HANDLES: readonly Handle[] = ['w', 'e', 'se']
/** Une sélection multiple ne se tire que par ses coins : elle garde toujours
 *  ses proportions, un bord n'aurait donc rien à faire seul. */
export const GROUP_HANDLES: readonly Handle[] = ['nw', 'ne', 'se', 'sw']
/** En deçà, la sélection s'écraserait en un point impossible à rattraper. */
const MIN_GROUP_SCALE = 0.05

/** Curseur CSS de chaque poignée. */
export const HANDLE_CURSOR: Record<Handle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
  start: 'move',
  end: 'move',
}

/**
 * Poignées d'un calque. Un badge n'en a pas : sa taille vient du réglage de
 * police, le tirer par un coin n'aurait aucun effet visible.
 */
export function handlesFor(kind: AnnotationKind): readonly Handle[] {
  if (isSegment(kind)) return SEGMENT_HANDLES
  if (kind === 'text') return TEXT_HANDLES
  if (isPoint(kind)) return []
  return AREA_HANDLES
}

/** Position d'une poignée dans son cadre, en fractions de celui-ci (0 → 1). */
export function handleAnchor(handle: Handle): Point {
  const anchors: Record<Handle, Point> = {
    nw: { x: 0, y: 0 },
    n: { x: 0.5, y: 0 },
    ne: { x: 1, y: 0 },
    e: { x: 1, y: 0.5 },
    se: { x: 1, y: 1 },
    s: { x: 0.5, y: 1 },
    sw: { x: 0, y: 1 },
    w: { x: 0, y: 0.5 },
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  }
  return anchors[handle]
}

/** Aimante un vecteur au multiple de 45° le plus proche, longueur conservée.
 *  Utilisé par les poignées et par le tracé (`lib/draft.ts`). */
export function snapTo45(w: number, h: number): { w: number; h: number } {
  const length = Math.hypot(w, h)
  if (length === 0) return { w, h }
  const step = Math.PI / 4
  const angle = Math.round(Math.atan2(h, w) / step) * step
  return { w: Math.cos(angle) * length, h: Math.sin(angle) * length }
}

/** Conserve les proportions d'origine en suivant la plus grande des deux. */
function keepRatio(w: number, h: number, ratio: number): { w: number; h: number } {
  if (!Number.isFinite(ratio) || ratio === 0) return { w, h }
  if (Math.abs(w) >= Math.abs(h * ratio)) return { w, h: (Math.sign(h) || 1) * Math.abs(w / ratio) }
  return { w: (Math.sign(w) || 1) * Math.abs(h * ratio), h }
}

/**
 * Applique le déplacement d'une poignée. `delta` et le rect sont en fractions
 * de la largeur de la fenêtre. `shift` conserve les proportions d'une surface,
 * et aimante une flèche aux multiples de 45°.
 */
export function applyHandle(
  rect: FractionRect,
  handle: Handle,
  delta: Point,
  shift: boolean,
  kind: AnnotationKind,
): FractionRect {
  if (isSegment(kind)) return applySegmentHandle(rect, handle, delta, shift)

  const ratio = rect.h === 0 ? 0 : rect.w / rect.h
  const west = handle === 'nw' || handle === 'w' || handle === 'sw'
  const east = handle === 'ne' || handle === 'e' || handle === 'se'
  const north = handle === 'nw' || handle === 'n' || handle === 'ne'
  const south = handle === 'sw' || handle === 's' || handle === 'se'

  let next: FractionRect = {
    x: rect.x + (west ? delta.x : 0),
    y: rect.y + (north ? delta.y : 0),
    w: rect.w + (east ? delta.x : 0) - (west ? delta.x : 0),
    h: rect.h + (south ? delta.y : 0) - (north ? delta.y : 0),
  }

  // Les proportions n'ont de sens que sur un coin : un bord ne bouge qu'un axe.
  const corner = (west || east) && (north || south)
  if (shift && corner) {
    const sized = keepRatio(next.w, next.h, ratio)
    next = {
      x: west ? rect.x + rect.w - sized.w : next.x,
      y: north ? rect.y + rect.h - sized.h : next.y,
      w: sized.w,
      h: sized.h,
    }
  }

  return next
}

function applySegmentHandle(
  rect: FractionRect,
  handle: Handle,
  delta: Point,
  shift: boolean,
): FractionRect {
  if (handle === 'start') {
    // La pointe ne bouge pas : c'est le départ qu'on tire, et l'aimantation
    // fait pivoter le trait autour de la pointe.
    const tip = { x: rect.x + rect.w, y: rect.y + rect.h }
    const vector = { w: rect.w - delta.x, h: rect.h - delta.y }
    const final = shift ? snapTo45(vector.w, vector.h) : vector
    return { x: tip.x - final.w, y: tip.y - final.h, w: final.w, h: final.h }
  }

  const vector = { w: rect.w + delta.x, h: rect.h + delta.y }
  const final = shift ? snapTo45(vector.w, vector.h) : vector
  return { x: rect.x, y: rect.y, w: final.w, h: final.h }
}

/** Boîte englobante d'une sélection multiple, tirée par un coin. Toujours
 *  homothétique, et jamais retournée : passer le coin opposé l'arrête au
 *  plancher plutôt que de renverser chaque calque. */
export function resizeGroup(rect: FractionRect, handle: Handle, delta: Point): FractionRect {
  const next = applyHandle(rect, handle, delta, true, 'box')
  const ratio = rect.w > 0 ? next.w / rect.w : next.h / rect.h
  const scale = Math.max(MIN_GROUP_SCALE, Number.isFinite(ratio) ? ratio : 1)
  const w = rect.w * scale
  const h = rect.h * scale
  return {
    x: handle.includes('w') ? rect.x + rect.w - w : rect.x,
    y: handle.includes('n') ? rect.y + rect.h - h : rect.y,
    w,
    h,
  }
}

/** Reporte l'homothétie `from → to` sur un calque : son rect suit, son signe
 *  reste (une flèche pointe toujours du même côté), et la taille d'un texte ou
 *  d'un badge grandit avec le reste. Le trait, lui, ne bouge pas. */
export function scaleLayer(
  layer: Pick<Annotation, 'kind' | 'rect' | 'size'>,
  from: FractionRect,
  to: FractionRect,
): Pick<Annotation, 'rect' | 'size'> {
  const ratio = from.w > 0 ? to.w / from.w : to.h / from.h
  const scale = Math.max(MIN_GROUP_SCALE, Number.isFinite(ratio) ? ratio : 1)
  const { rect } = layer
  return {
    rect: {
      x: to.x + (rect.x - from.x) * scale,
      y: to.y + (rect.y - from.y) * scale,
      w: rect.w * scale,
      h: rect.h * scale,
    },
    // La taille reste dans les bornes de l'inspecteur : un groupe étiré ne doit
    // pas produire une valeur que le curseur ne sait pas afficher.
    size: isPoint(layer.kind)
      ? clamp(layer.size * scale, ANNOTATION_LIMITS.size.min, ANNOTATION_LIMITS.size.max)
      : layer.size,
  }
}

/**
 * Poignée d'un texte. Un bord fixe la largeur de retour à la ligne — partie de
 * la largeur affichée, pour que le premier geste ne fasse pas sauter le
 * cadre — ; le coin agrandit la police, et la largeur fixée avec elle.
 * `delta` en fractions de la largeur de la fenêtre, depuis la saisie.
 */
export function resizeText(
  layer: Annotation,
  handle: Handle,
  delta: Point,
  box: WindowBox,
  measure: Measure = measureText,
): Partial<Annotation> {
  const layout = layoutText(layer, box, measure)
  const width = layout.width / box.width
  const floor = layer.size * 2

  if (handle === 'e' || handle === 'w') {
    const west = handle === 'w'
    const next = Math.max(floor, width + (west ? -delta.x : delta.x))
    return { rect: { ...layer.rect, x: west ? layer.rect.x + width - next : layer.rect.x, w: next } }
  }

  const height = layout.height / box.width
  const limits = ANNOTATION_LIMITS.size
  const size = clamp((layer.size * (height + delta.y)) / height, limits.min, limits.max)
  const ratio = size / layer.size
  return { size, rect: { ...layer.rect, w: layer.rect.w * ratio } }
}

/** Déplacement au clavier, en fractions de la largeur de la fenêtre. */
export function nudge(rect: FractionRect, dx: number, dy: number): FractionRect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy }
}

/** Décalage appliqué à une copie, pour qu'elle ne masque pas l'originale. */
export const DUPLICATE_OFFSET = 0.02
