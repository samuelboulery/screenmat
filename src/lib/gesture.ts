import { bounds, createAnnotation, overlaps, rectFromPoints, toFractions, type Point } from './annotate.ts'
import { draftRect, withDraft } from './draft.ts'
import type { Handle } from './handles.ts'
import { inWindow, type Target } from './hit.ts'
import type { WindowBox } from './render.ts'
import { flatten } from './tree.ts'
import type { Annotation, AnnotationKind, FractionRect, LayerNode, Placement, Scene } from '../types.ts'

/* Les gestes de la preview, sans React : ce qu'un glisser porte, ce qu'il
   peint en cours de route, ce qu'un rectangle de sélection attrape. */

/** Un glisser en cours sur le canvas. `from`/`to` en px canvas. */
export type Drag =
  | { mode: 'draw'; kind: AnnotationKind; target: Target; from: Point; to: Point; shift: boolean }
  | { mode: 'marquee'; target: Target; from: Point; to: Point; additive: boolean }
  | { mode: 'move'; ids: string[]; target: Target; from: Point; to: Point }
  | { mode: 'shot'; shotId: string; origin: Placement; target: Target; from: Point; to: Point }
  | {
      mode: 'resize'
      id: string
      target: Target
      origin: FractionRect
      kind: AnnotationKind
      handle: Handle
      from: Point
      to: Point
    }
  | {
      mode: 'group'
      /** Les calques tels qu'à la saisie : chaque frame repart d'eux, sans
       *  cumuler d'arrondi. */
      origins: Annotation[]
      target: Target
      rect: FractionRect
      handle: Handle
      from: Point
      to: Point
    }

/** La scène augmentée du tracé en cours : on voit la forme finale pendant le
 *  geste, pas une approximation. Sans tracé, la scène revient telle quelle. */
export function paintDraft(scene: Scene, drag: Drag | null): Scene {
  if (drag?.mode !== 'draw') return scene
  const box = drag.target.box
  const rect = draftRect(drag.kind, inWindow(box, drag.from), inWindow(box, drag.to), drag.shift)
  if (!rect) return scene
  return withDraft(scene, drag.target.shotId, createAnnotation(drag.kind, toFractions(rect, box)))
}

/** Les calques qu'effleure un rectangle de sélection tracé de `from` à `to`.
 *  Masqués et verrouillés n'en font pas partie. */
export function marqueeCatch(layers: readonly LayerNode[], box: WindowBox, from: Point, to: Point): string[] {
  const area = rectFromPoints(inWindow(box, from), inWindow(box, to))
  return flatten(layers, { skipHidden: true, skipLocked: true })
    .filter((annotation) => overlaps(bounds(annotation, box), area))
    .map((annotation) => annotation.id)
}
