import { bounds, createAnnotation, overlaps, rectFromPoints, toFractions, type Point } from './annotate.ts'
import { draftRect, withDraft } from './draft.ts'
import type { Handle } from './handles.ts'
import { inWindow, type Target } from './hit.ts'
import type { Geometry, WindowBox } from './render.ts'
import { panTravel, screenRect } from './screen.ts'
import { toolStyle } from './tool-style.ts'
import { flatten } from './tree.ts'
import {
  DEFAULT_PAN,
  type Annotation,
  type AnnotationKind,
  type FractionRect,
  type LayerNode,
  type Pan,
  type Placement,
  type Scene,
} from '../types.ts'

/* Les gestes de la preview, sans React : ce qu'un glisser porte, ce qu'il
   peint en cours de route, ce qu'un rectangle de sélection attrape. */

/** Un glisser en cours sur le canvas. `from`/`to` en px canvas. */
export type Drag =
  | { mode: 'draw'; kind: AnnotationKind; target: Target; from: Point; to: Point; shift: boolean }
  | { mode: 'marquee'; target: Target; from: Point; to: Point; additive: boolean }
  | { mode: 'move'; ids: string[]; target: Target; from: Point; to: Point }
  | { mode: 'shot'; shotId: string; origin: Placement; target: Target; from: Point; to: Point }
  /** Espace + glisser : le screenshot glisse dans son écran. `travel` est son
   *  débord, en largeurs de fenêtre. */
  | { mode: 'pan'; shotId: string; origin: Pan; travel: Point; target: Target; from: Point; to: Point }
  | {
      mode: 'resize'
      id: string
      target: Target
      origin: FractionRect
      kind: AnnotationKind
      /** Le calque tel qu'à la saisie : un texte se redimensionne d'après sa
       *  mise en page, pas seulement son rect. */
      layer: Annotation
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

/** Distance, en px canvas, à partir de laquelle un ⌥-glisser sur un calque le
 *  duplique : en deçà c'est un clic qui a tremblé, et il ne doit rien créer. */
export const COPY_THRESHOLD = 4

/** Le glisser du screenshot visé, ou `null` s'il tient dans son écran. */
export function panStart(scene: Scene, geometry: Geometry, target: Target, point: Point): Drag | null {
  const shot = scene.shots.find((item) => item.id === target.shotId)
  if (!shot) return null
  const travel = panTravel(target.box, screenRect(target.box, geometry, scene.settings), shot.image)
  if (travel.x === 0 && travel.y === 0) return null
  return { mode: 'pan', shotId: shot.id, origin: shot.pan ?? DEFAULT_PAN, travel, target, from: point, to: point }
}

/** La scène augmentée du tracé en cours : on voit la forme finale pendant le
 *  geste, pas une approximation. Sans tracé, la scène revient telle quelle. */
export function paintDraft(scene: Scene, drag: Drag | null): Scene {
  if (drag?.mode !== 'draw') return scene
  const box = drag.target.box
  const rect = draftRect(drag.kind, inWindow(box, drag.from), inWindow(box, drag.to), drag.shift)
  if (!rect) return scene
  return withDraft(scene, drag.target.shotId, createAnnotation(drag.kind, toFractions(rect, box), toolStyle(drag.kind)))
}

/** Les calques qu'effleure un rectangle de sélection tracé de `from` à `to`.
 *  Masqués et verrouillés n'en font pas partie. */
export function marqueeCatch(layers: readonly LayerNode[], box: WindowBox, from: Point, to: Point): string[] {
  const area = rectFromPoints(inWindow(box, from), inWindow(box, to))
  return flatten(layers, { skipHidden: true, skipLocked: true })
    .filter((annotation) => overlaps(bounds(annotation, box), area))
    .map((annotation) => annotation.id)
}
