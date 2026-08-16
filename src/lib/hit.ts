/** Ce que le pointeur désigne : quelle fenêtre, quel calque. Logique pure —
 *  aucune dépendance à React ni à un contexte canvas, et donc testable telle
 *  quelle. La preview s'en sert pour router un geste ; le rendu ne la connaît
 *  pas. */
import { hitTest, type Point } from './annotate.ts'
import { applyMatrix, invertMatrix, windowMatrix } from './frame.ts'
import { flatten } from './tree.ts'
import type { Geometry, WindowBox } from './render.ts'
import type { Annotation, Scene } from '../types.ts'

/** La fenêtre visée par un geste, capturée à son début : le brouillon en a
 *  besoin pendant le rendu, où la géométrie de la frame courante n'existe pas
 *  encore. Elle ne bouge pas en cours de geste. */
export type Target = { shotId: string; box: WindowBox }

/** Le point ramené dans l'espace non tourné d'une fenêtre. `windowMatrix` est
 *  la seule description de cette rotation : on l'inverse plutôt que de reposer
 *  une trigonométrie parallèle. */
export function inWindow(box: WindowBox, point: Point): Point {
  return applyMatrix(invertMatrix(windowMatrix(box)), point)
}

/** Le shot dessiné dans la n-ième fenêtre. */
function shotAt(scene: Scene, geometry: Geometry, index: number) {
  return scene.shots[geometry.windows[index]?.shot ?? 0] ?? null
}

function contains(box: WindowBox, local: Point): boolean {
  return (
    local.x >= box.x &&
    local.x <= box.x + box.width &&
    local.y >= box.y &&
    local.y <= box.y + box.height
  )
}

/**
 * Fenêtre visée par un tracé : celle qui contient le point, la plus en avant
 * d'abord ; à défaut celle du shot sélectionné. Le repli compte — un tracé
 * commencé dans le vide doit atterrir quelque part, sinon le geste se perd.
 */
export function windowAt(
  scene: Scene,
  geometry: Geometry | null,
  point: Point,
  selectedShotId?: string | null,
): Target | null {
  if (!geometry) return null

  for (let index = geometry.windows.length - 1; index >= 0; index -= 1) {
    const box = geometry.windows[index]
    if (contains(box, inWindow(box, point))) {
      const shot = shotAt(scene, geometry, index)
      if (shot) return { shotId: shot.id, box }
    }
  }

  const fallback = geometry.windows.findIndex(
    (box) => scene.shots[box.shot]?.id === (selectedShotId ?? scene.shots[0]?.id),
  )
  const index = fallback >= 0 ? fallback : 0
  const shot = shotAt(scene, geometry, index)
  return shot ? { shotId: shot.id, box: geometry.windows[index] } : null
}

/**
 * Le calque sous le pointeur, toutes fenêtres confondues. Masqués et
 * verrouillés sont hors d'atteinte : c'est tout l'intérêt du cadenas.
 */
export function layerAt(
  scene: Scene,
  geometry: Geometry | null,
  point: Point,
): { annotation: Annotation; target: Target } | null {
  if (!geometry) return null

  for (let index = geometry.windows.length - 1; index >= 0; index -= 1) {
    const box = geometry.windows[index]
    const shot = shotAt(scene, geometry, index)
    if (!shot) continue
    const reachable = flatten(shot.layers, { skipHidden: true, skipLocked: true })
    const hit = hitTest(reachable, inWindow(box, point), box)
    if (hit) return { annotation: hit, target: { shotId: shot.id, box } }
  }
  return null
}
