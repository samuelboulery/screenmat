import { scaleLayer } from './handles.ts'
import { computeGeometry } from './render.ts'
import { screenRect, sourceRect } from './screen.ts'
import { mapAnnotations } from './tree.ts'
import type { Point } from './annotate.ts'
import { DEFAULT_PAN, type FractionRect, type LayerNode, type Pan, type Settings, type Shot } from '../types.ts'

/* Les calques vivent dans le repère de leur fenêtre, pas dans celui de l'image.
   Quand le screenshot bouge dans sa fenêtre — il glisse dans son écran, le
   cadre change, un ratio se verrouille —, ils doivent le suivre : sinon un
   floutage découvre ce qu'il masquait, y compris sur les images d'un lot qu'on
   n'a pas sous les yeux. */

type ImageSize = { naturalWidth: number; naturalHeight: number }

/**
 * Le rectangle qu'occuperait l'image **entière** dans sa fenêtre, en fractions
 * de la largeur de celle-ci — il déborde de l'écran quand l'image est rognée.
 * `lead` est l'image qui donne son rapport à la fenêtre : la première de la
 * composition, ou l'image elle-même quand elle est rendue seule.
 */
export function imageRect(lead: ImageSize, image: ImageSize, settings: Settings, pan?: Pan): FractionRect {
  const geometry = computeGeometry(lead.naturalWidth, lead.naturalHeight, settings)
  const box = geometry.window
  const screen = screenRect(box, geometry, settings)
  const source = sourceRect(screen, image, pan)
  const k = screen.width / source.w

  return {
    x: (screen.x - source.x * k - box.x) / box.width,
    y: (screen.y - source.y * k - box.y) / box.width,
    w: (image.naturalWidth * k) / box.width,
    h: (image.naturalHeight * k) / box.width,
  }
}

/** Reporte sur les calques le déplacement de l'image de `from` à `to`. Sans
 *  le plancher des poignées de groupe : ici le rapport est celui de l'image, et
 *  le borner poserait le calque ailleurs que sur ses pixels. */
export function reanchor(layers: readonly LayerNode[], from: FractionRect, to: FractionRect): LayerNode[] {
  return mapAnnotations(layers, (layer) => ({ ...layer, ...scaleLayer(layer, from, to, 0) }))
}

/** Les images que le mode combiné compose, dans l'ordre de la liste. Sans
 *  aucune cochée, la première : un canvas vide passerait pour un bug. */
export function pickMembers(shots: readonly Shot[], members: readonly string[]): Shot[] {
  const picked = shots.filter((shot) => members.includes(shot.id))
  return picked.length > 0 ? picked : shots.slice(0, 1)
}

/** La liste après le déplacement d'un élément ; la même si rien ne bouge. */
export function moved<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items
  const next = [...items]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

/** Les membres après un clic sur `id`. Le dernier reste : une composition vide
 *  retomberait en silence sur la première image, montrée pourtant décochée. */
export function toggled(members: readonly string[], id: string): readonly string[] {
  if (!members.includes(id)) return [...members, id]
  return members.length > 1 ? members.filter((item) => item !== id) : members
}

/**
 * Tout ce qui décide d'où chaque screenshot atterrit dans sa fenêtre : les
 * réglages, et la composition — ses membres (`null` en mode séparé) et l'ordre
 * des images, puisque la première donne son rapport aux autres.
 */
export type View = { settings: Settings; order: readonly Shot[]; members: readonly string[] | null }

/** L'image qui donne son rapport à la fenêtre de `shot`. */
function leadOf(view: View, shot: Shot): ImageSize {
  if (!view.members) return shot.image
  const composed = pickMembers(view.order, view.members)
  return composed.some((item) => item.id === shot.id) ? composed[0].image : shot.image
}

const sameRect = (a: FractionRect, b: FractionRect) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h

/**
 * Les shots d'une vue à l'autre, calques recalés sur leur image. Un réglage de
 * cadre, un ratio verrouillé, mais aussi une image réordonnée, décochée ou le
 * passage du séparé au combiné : tout ce qui change la tête d'une composition
 * rogne ses membres autrement. Rend le même tableau si aucun screenshot ne bouge.
 */
export function reanchorShots(shots: Shot[], before: View, after: View): Shot[] {
  let touched = false
  const next = shots.map((shot) => {
    if (shot.layers.length === 0) return shot
    const from = imageRect(leadOf(before, shot), shot.image, before.settings, shot.pan)
    const to = imageRect(leadOf(after, shot), shot.image, after.settings, shot.pan)
    if (sameRect(from, to)) return shot
    touched = true
    return { ...shot, layers: reanchor(shot.layers, from, to) }
  })
  return touched ? next : shots
}

/**
 * Le shot après un glisser de son screenshot dans son écran, calques emportés.
 * `travel` est le débord de l'image en largeurs de fenêtre (`panTravel`).
 * L'écart se lit dans le shot, pas dans le geste : les calques bougent
 * exactement de ce dont l'image a bougé, bornes comprises.
 */
export function panShot(shot: Shot, next: Pan, travel: Point): Shot {
  const previous = shot.pan ?? DEFAULT_PAN
  const dx = (previous.x - next.x) * travel.x
  const dy = (previous.y - next.y) * travel.y
  return {
    ...shot,
    pan: next,
    layers: mapAnnotations(shot.layers, (layer) => ({
      ...layer,
      rect: { ...layer.rect, x: layer.rect.x + dx, y: layer.rect.y + dy },
    })),
  }
}
