import { useCallback } from 'react'
import type { ShotsState } from './useShots.ts'
import { expandSelection, isGroup } from '../lib/tree.ts'

/** Pas d'un déplacement au clavier, en fraction de la largeur de la fenêtre. */
const NUDGE_STEP = 0.002

export type LayerActions = {
  onDelete: () => void
  onDuplicate: () => void
  onEscape: () => void
  onLayerMove: (direction: 'up' | 'down') => void
  onNudge: (dx: number, dy: number, large: boolean) => void
  onSelectAll: () => void
  onGroup: () => void
  onUngroup: () => void
}

/**
 * Les actions clavier qui portent sur la sélection de calques. Toutes sont des
 * no-op sans sélection : le raccourci ne doit jamais toucher un autre calque.
 */
export function useLayerActions(shots: ShotsState): LayerActions {
  const shot = shots.activeShot
  const shotId = shot?.id ?? null
  const ids = shots.selectedLayerIds

  const {
    deleteLayers,
    duplicateLayers,
    moveLayer,
    translateLayers,
    groupLayers,
    ungroupLayer,
    selectLayers,
  } = shots

  const onSelection = useCallback(
    (act: (shot: string, layers: readonly string[]) => void) => {
      if (shotId && ids.length > 0) act(shotId, ids)
    },
    [shotId, ids],
  )

  return {
    onDelete: useCallback(() => onSelection(deleteLayers), [onSelection, deleteLayers]),
    onDuplicate: useCallback(() => onSelection(duplicateLayers), [onSelection, duplicateLayers]),
    onEscape: useCallback(() => selectLayers([]), [selectLayers]),
    // Un ordre de pile ne se déplace qu'un nœud à la fois : à plusieurs, les
    // permutations se marcheraient dessus.
    onLayerMove: useCallback(
      (direction: 'up' | 'down') => {
        if (shotId && ids.length === 1) moveLayer(shotId, ids[0], direction)
      },
      [shotId, ids, moveLayer],
    ),
    onNudge: useCallback(
      (dx: number, dy: number, large: boolean) => {
        const step = NUDGE_STEP * (large ? 5 : 1)
        onSelection((id, layers) =>
          translateLayers(id, expandSelection(shot?.layers ?? [], layers), dx * step, dy * step),
        )
      },
      [onSelection, translateLayers, shot],
    ),
    onSelectAll: useCallback(() => {
      if (shot) selectLayers(shot.layers.map((node) => node.id))
    }, [shot, selectLayers]),
    onGroup: useCallback(() => onSelection(groupLayers), [onSelection, groupLayers]),
    onUngroup: useCallback(() => {
      if (!shotId || !shot) return
      for (const id of ids) {
        const node = shot.layers.find((item) => item.id === id)
        if (node && isGroup(node)) ungroupLayer(shotId, id)
      }
    }, [shotId, shot, ids, ungroupLayer]),
  }
}
