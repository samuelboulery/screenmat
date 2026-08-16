import { useCallback, useMemo } from 'react'
import type { ShotsState } from './useShots.ts'
import { nudge } from '../lib/handles.ts'

/** Pas d'un déplacement au clavier, en fraction de la largeur de la fenêtre. */
const NUDGE_STEP = 0.002

export type LayerActions = {
  onDelete: () => void
  onDuplicate: () => void
  onEscape: () => void
  onLayerMove: (direction: 'up' | 'down') => void
  onNudge: (dx: number, dy: number, large: boolean) => void
}

/**
 * Les actions clavier qui portent sur le calque sélectionné. Toutes sont des
 * no-op sans sélection : le raccourci ne doit jamais toucher un autre calque.
 */
export function useLayerActions(shots: ShotsState): LayerActions {
  const shotId = shots.activeShot?.id ?? null
  const layerId = shots.selectedAnnotationId

  const selected = useMemo(
    () =>
      shots.activeShot?.annotations.find((annotation) => annotation.id === layerId) ?? null,
    [shots.activeShot, layerId],
  )

  const onSelected = useCallback(
    (act: (shot: string, layer: string) => void) => {
      if (shotId && layerId) act(shotId, layerId)
    },
    [shotId, layerId],
  )

  const { deleteAnnotation, duplicateAnnotation, moveAnnotation, patchAnnotation } = shots
  const selectAnnotation = shots.selectAnnotation

  return {
    onDelete: useCallback(
      () => onSelected(deleteAnnotation),
      [onSelected, deleteAnnotation],
    ),
    onDuplicate: useCallback(
      () => onSelected(duplicateAnnotation),
      [onSelected, duplicateAnnotation],
    ),
    onEscape: useCallback(() => selectAnnotation(null), [selectAnnotation]),
    onLayerMove: useCallback(
      (direction: 'up' | 'down') =>
        onSelected((shot, layer) => moveAnnotation(shot, layer, direction)),
      [onSelected, moveAnnotation],
    ),
    onNudge: useCallback(
      (dx: number, dy: number, large: boolean) =>
        onSelected((shot, layer) => {
          if (!selected) return
          const step = NUDGE_STEP * (large ? 5 : 1)
          patchAnnotation(shot, layer, { rect: nudge(selected.rect, dx * step, dy * step) })
        }),
      [onSelected, patchAnnotation, selected],
    ),
  }
}
