import { bounds, isSegment, toPixels } from '../lib/annotate.ts'
import { applyMatrix, windowMatrix, type Matrix } from '../lib/frame.ts'
import { HANDLE_CURSOR, handleAnchor, handlesFor, type Handle } from '../lib/handles.ts'
import type { WindowBox } from '../lib/render.ts'
import type { Annotation } from '../types.ts'

/* Cadre de sélection et poignées. En DOM, jamais dans le canvas : rien de tout
   ceci n'apparaît dans le fichier exporté. */

type SelectionOverlayProps = {
  annotation: Annotation
  box: WindowBox
  /** Rapport px CSS / px canvas — la preview est rendue à l'échelle écran. */
  ratio: number
  /** Absent ⇒ cadre seul, sans poignées : c'est le cas d'une sélection
   *  multiple, ou d'un tracé en cours. */
  onGrab?: (handle: Handle, event: React.PointerEvent) => void
}

/** Position d'une poignée en px canvas, avant la rotation de la fenêtre. */
function handlePoint(annotation: Annotation, box: WindowBox, handle: Handle) {
  if (isSegment(annotation.kind)) {
    const rect = toPixels(annotation.rect, box)
    return handle === 'start'
      ? { x: rect.x, y: rect.y }
      : { x: rect.x + rect.w, y: rect.y + rect.h }
  }

  const area = bounds(annotation, box)
  const anchor = handleAnchor(handle)
  return { x: area.x + area.w * anchor.x, y: area.y + area.h * anchor.y }
}

export default function SelectionOverlay({
  annotation,
  box,
  ratio,
  onGrab,
}: SelectionOverlayProps) {
  const matrix: Matrix = windowMatrix(box)
  const area = bounds(annotation, box)
  const origin = applyMatrix(matrix, { x: area.x, y: area.y })

  // Le cadre suit l'inclinaison de la fenêtre ; les poignées restent droites
  // pour rester saisissables.
  const frame = `matrix(${matrix[0]}, ${matrix[1]}, ${matrix[2]}, ${matrix[3]}, ${origin.x * ratio}, ${origin.y * ratio})`

  return (
    <>
      <div
        className="pointer-events-none absolute left-0 top-0 rounded-xs"
        style={{
          width: area.w * ratio,
          height: area.h * ratio,
          transformOrigin: '0 0',
          transform: frame,
          border: '1.5px solid #7DE2FF',
          background: 'rgba(7,7,10,.10)',
        }}
      />

      {(onGrab ? handlesFor(annotation.kind) : []).map((handle) => {
        const point = applyMatrix(matrix, handlePoint(annotation, box, handle))
        return (
          <span
            key={handle}
            role="presentation"
            onPointerDown={(event) => onGrab?.(handle, event)}
            // Le carré reste à 9 px — c'est la DA. La cible, elle, monte à 24 px
            // par un pseudo-élément centré : en dessous, WCAG 2.5.8 n'est pas
            // tenu et la poignée se rate à la souris comme au doigt.
            className="absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-xs border border-stage bg-accent before:absolute before:-inset-[7.5px] before:content-['']"
            style={{
              left: point.x * ratio,
              top: point.y * ratio,
              cursor: HANDLE_CURSOR[handle],
              touchAction: 'none',
            }}
          />
        )
      })}
    </>
  )
}
