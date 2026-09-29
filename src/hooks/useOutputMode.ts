import { useCallback, useRef } from 'react'
import type { ShotsState } from './useShots.ts'
import type { Composition, LayoutKind, OutputMode } from '../types.ts'

/**
 * Séparé ou combiné. Aucun champ de plus dans le document : `layout: 'single'`
 * est le mode séparé — chaque image se rend seule — et toute autre disposition
 * est le mode combiné, qui compose les images cochées. Revenir au combiné
 * retrouve la dernière disposition choisie.
 */
export function useOutputMode(
  composition: Composition,
  compose: (patch: Partial<Composition>) => void,
  shots: Pick<ShotsState, 'shots' | 'selection' | 'setMembers'>,
): { mode: OutputMode; setMode: (mode: OutputMode) => void } {
  const mode: OutputMode = composition.layout === 'single' ? 'separate' : 'combined'
  const lastLayout = useRef<Exclude<LayoutKind, 'single'>>('stack')

  const setMode = useCallback(
    (next: OutputMode) => {
      if (next === mode) return
      if (next === 'separate') {
        if (composition.layout !== 'single') lastLayout.current = composition.layout
        compose({ layout: 'single' })
        return
      }
      // Une composition d'une seule image ne compose rien : à moins de deux
      // cochées, on les prend toutes.
      if (shots.selection.length < 2) shots.setMembers(shots.shots.map((shot) => shot.id))
      compose({ layout: lastLayout.current })
    },
    [mode, composition.layout, compose, shots],
  )

  return { mode, setMode }
}
