import { isPoint, isSegment, type Point, type Rect } from './annotate.ts'
import { snapTo45 } from './handles.ts'
import type { AnnotationKind, LayerNode, Scene } from '../types.ts'

/* Le tracé en cours. Le brouillon est une annotation comme les autres, glissée
   dans la scène : la preview n'a donc rien de spécial à dessiner, et ce qu'on
   voit pendant le geste est exactement ce qu'on obtiendra. */

/** Longueur minimale d'un tracé pour qu'il crée un calque, en px canvas. */
export const MIN_DRAW = 4

/**
 * Rectangle tracé, en px canvas et dans l'espace non tourné de la fenêtre.
 * `null` si le geste est trop court pour valoir un calque.
 *
 * `shift` aimante : un segment aux multiples de 45° — donc horizontales,
 * verticales et diagonales parfaites — une surface au carré.
 */
export function draftRect(
  kind: AnnotationKind,
  from: Point,
  to: Point,
  shift: boolean,
): Rect | null {
  // Un badge et un label se posent d'un clic : leur taille vient du réglage de
  // police, pas du geste.
  if (isPoint(kind)) return { x: from.x, y: from.y, w: 0, h: 0 }

  const w = to.x - from.x
  const h = to.y - from.y
  if (Math.hypot(w, h) < MIN_DRAW) return null

  // Une flèche horizontale a une hauteur nulle : c'est la longueur qui compte,
  // et le signe du rect porte le sens du tracé.
  if (isSegment(kind)) {
    const vector = shift ? snapTo45(w, h) : { w, h }
    return { x: from.x, y: from.y, w: vector.w, h: vector.h }
  }

  const side = Math.max(Math.abs(w), Math.abs(h))
  const sized = shift
    ? { w: Math.sign(w) * side || side, h: Math.sign(h) * side || side }
    : { w, h }

  return {
    x: Math.min(from.x, from.x + sized.w),
    y: Math.min(from.y, from.y + sized.h),
    w: Math.abs(sized.w),
    h: Math.abs(sized.h),
  }
}

/** La scène augmentée du brouillon, posé au sommet de la pile de son shot. */
export function withDraft(scene: Scene, shotId: string, draft: LayerNode): Scene {
  return {
    ...scene,
    shots: scene.shots.map((shot) =>
      shot.id === shotId ? { ...shot, layers: [...shot.layers, draft] } : shot,
    ),
  }
}
