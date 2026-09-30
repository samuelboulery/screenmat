import SelectionOverlay, { ShotRing } from './SelectionOverlay.tsx'
import { GROUP_HANDLES, type Handle } from '../lib/handles.ts'
import type { WindowBox } from '../lib/render.ts'
import type { Annotation, FractionRect } from '../types.ts'

type SelectionLayerProps = {
  /** Plusieurs fenêtres à l'écran : l'active porte un anneau. */
  multiShot: boolean
  box: WindowBox | null
  /** Rayon des coins d'une fenêtre, en px canvas — celui de `Geometry`. */
  radius: number
  ratio: number
  chosen: readonly Annotation[]
  /** Boîte englobante d'une sélection multiple, en fractions de la fenêtre. */
  groupRect: FractionRect | null
  hover: { annotation: Annotation; box: WindowBox } | null
  /** Un tracé en cours : le chrome se tait pour laisser voir la forme. */
  drawing: boolean
  /** Un geste en cours : le survol se tait, il suivrait le curseur à contretemps. */
  dragging: boolean
  onGrab: (handle: Handle, event: React.PointerEvent) => void
}

/** Le chrome de sélection au-dessus du canvas : anneau de la fenêtre active,
 *  cadres et poignées, boîte englobante, survol. En DOM, jamais exporté. */
export default function SelectionLayer({
  multiShot,
  box,
  radius,
  ratio,
  chosen,
  groupRect,
  hover,
  drawing,
  dragging,
  onGrab,
}: SelectionLayerProps) {
  if (!box || ratio <= 0) return null
  const hovered = hover && !dragging && !chosen.some((item) => item.id === hover.annotation.id)

  return (
    <>
      {/* En layout `single` il n'y a qu'une fenêtre : un anneau permanent
          autour d'elle serait du bruit, pas un repère. */}
      {multiShot && <ShotRing box={box} ratio={ratio} radius={radius} />}

      {!drawing &&
        chosen.map((annotation) => (
          <SelectionOverlay
            key={annotation.id}
            annotation={annotation}
            box={box}
            ratio={ratio}
            // À plusieurs, les poignées vont à la boîte englobante.
            onGrab={chosen.length === 1 ? onGrab : undefined}
          />
        ))}

      {!drawing && groupRect && chosen.length > 1 && (
        <SelectionOverlay
          annotation={{ ...chosen[0], kind: 'box', rect: groupRect }}
          box={box}
          ratio={ratio}
          handles={GROUP_HANDLES}
          variant="group"
          onGrab={onGrab}
        />
      )}

      {hovered && (
        <SelectionOverlay annotation={hover.annotation} box={hover.box} ratio={ratio} variant="hover" />
      )}
    </>
  )
}
