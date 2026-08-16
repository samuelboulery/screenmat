import { isPoint, isSegment, type Point } from './annotate.ts'
import type { AnnotationKind, FractionRect } from '../types.ts'

/* Géométrie des poignées de sélection. Logique pure : les poignées elles-mêmes
   sont en DOM (`SelectionOverlay`) et ne sortent jamais dans l'export. */

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'start' | 'end'

const AREA_HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const SEGMENT_HANDLES: readonly Handle[] = ['start', 'end']

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
 * Poignées d'un calque. Un badge et un label n'en ont pas : leur taille vient
 * du réglage de police, les tirer par un coin n'aurait aucun effet visible.
 */
export function handlesFor(kind: AnnotationKind): readonly Handle[] {
  if (isSegment(kind)) return SEGMENT_HANDLES
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

/** Déplacement au clavier, en fractions de la largeur de la fenêtre. */
export function nudge(rect: FractionRect, dx: number, dy: number): FractionRect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy }
}

/** Décalage appliqué à une copie, pour qu'elle ne masque pas l'originale. */
export const DUPLICATE_OFFSET = 0.02
