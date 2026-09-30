import { useCallback, useMemo } from 'react'
import { moved, toggled, type View } from '../lib/anchor.ts'
import type { ShotsState } from './useShots.ts'
import type { Composition, Settings } from '../types.ts'

/**
 * Tous les gestes qui déplacent un screenshot dans sa fenêtre sans toucher à
 * ses calques, enrobés pour les emporter : un réglage de cadre ou de ratio
 * (`retune`, `restyle`), et tout ce qui change la première image d'une
 * composition — l'ordre, les membres, le passage du séparé au combiné. Sans ça,
 * un floutage découvrirait ce qu'il masquait, y compris dans le lot.
 *
 * Chaque geste décrit la vue d'avant et celle d'après ; `reanchorShots` ne
 * touche que les images dont le screenshot bouge. L'annulation n'y passe pas :
 * elle restaure images, réglages, composition et membres d'un bloc.
 */
export function useAnchoredSettings(
  shots: ShotsState,
  settings: Settings,
  composition: Composition,
  patch: (next: Partial<Settings>) => void,
  setSettings: (next: Settings) => void,
  compose: (next: Partial<Composition>) => void,
) {
  const { reanchor, shots: order, selection, setMembers, reorder: reorderShots } = shots
  const combined = composition.layout !== 'single'

  const view = useMemo<View>(
    () => ({ settings, order, members: combined ? selection : null }),
    [settings, order, selection, combined],
  )
  const move = useCallback((next: Partial<View>) => reanchor(view, { ...view, ...next }), [reanchor, view])

  const retune = useCallback(
    (next: Partial<Settings>) => {
      move({ settings: { ...settings, ...next } })
      patch(next)
    },
    [move, settings, patch],
  )

  const restyle = useCallback(
    (next: Settings) => {
      move({ settings: next })
      setSettings(next)
    },
    [move, setSettings],
  )

  const reorder = useCallback(
    (from: number, to: number) => {
      move({ order: moved([...order], from, to) })
      reorderShots(from, to)
    },
    [move, order, reorderShots],
  )

  const toggleMember = useCallback(
    (id: string) => {
      const members = toggled(selection, id)
      if (combined) move({ members })
      setMembers(members)
    },
    [move, selection, combined, setMembers],
  )

  /** Un patch de composition ; `members` quand le geste les remplace aussi. */
  const recompose = useCallback(
    (next: Partial<Composition>, members: readonly string[] = selection) => {
      const layout = next.layout ?? composition.layout
      // Écart, convergence, colonnes : rien là ne déplace un screenshot.
      if (next.layout !== undefined || members !== selection) move({ members: layout === 'single' ? null : members })
      if (members !== selection) setMembers(members)
      compose(next)
    },
    [move, selection, composition.layout, setMembers, compose],
  )

  return { retune, restyle, reorder, toggleMember, recompose }
}
