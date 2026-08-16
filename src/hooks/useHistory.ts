import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ShotsState } from './useShots.ts'
import {
  canRedo,
  canUndo,
  commit,
  initHistory,
  redo as redoHistory,
  signature,
  undo as undoHistory,
  type History,
  type Snapshot,
} from '../lib/history.ts'
import type { Composition, Settings } from '../types.ts'

/** Deux états de même structure séparés de moins de ça fusionnent en une seule
 *  entrée : un glissement de slider ou de poignée ne remplit pas la pile. */
const COALESCE_MS = 400

export type HistoryState = {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

/**
 * Observe le document et empile ses états. L'observation par effet évite
 * d'instrumenter chaque mutation : les hooks existants n'ont rien à savoir de
 * l'historique.
 *
 * ponytail: pile en mémoire, perdue au rechargement — la persister dans
 * IndexedDB si le besoin apparaît (le store existe déjà, `lib/store.ts`).
 */
export function useHistory(current: Snapshot, apply: (snapshot: Snapshot) => void): HistoryState {
  const [history, setHistory] = useState<History>(() => initHistory(current))

  /** Vrai le temps qu'un undo/redo se propage : on ne réempile pas son effet. */
  const applying = useRef(false)
  const lastCommit = useRef(0)
  const lastSignature = useRef(signature(current))

  useEffect(() => {
    if (applying.current) {
      applying.current = false
      lastSignature.current = signature(current)
      return
    }

    const next = signature(current)
    const now = performance.now()
    // Une création ou une suppression change la structure : elle mérite
    // toujours sa propre entrée, même à quelques millisecondes de la précédente.
    const coalesce = next === lastSignature.current && now - lastCommit.current < COALESCE_MS

    lastSignature.current = next
    lastCommit.current = now
    setHistory((state) => (state.present === current ? state : commit(state, current, coalesce)))
  }, [current])

  const step = useCallback(
    (move: (state: History) => History) => {
      const next = move(history)
      if (next === history) return
      applying.current = true
      lastCommit.current = 0
      apply(next.present)
      setHistory(next)
    },
    [history, apply],
  )

  return {
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    undo: useCallback(() => step(undoHistory), [step]),
    redo: useCallback(() => step(redoHistory), [step]),
  }
}

/** L'historique du document de l'éditeur : shots, réglages, composition. */
export function useDocumentHistory(
  shots: ShotsState,
  settings: Settings,
  setSettings: (settings: Settings) => void,
  composition: Composition,
  setComposition: (composition: Composition) => void,
): HistoryState {
  const document = useMemo(
    () => ({ shots: shots.shots, settings, composition }),
    [shots.shots, settings, composition],
  )

  const { restore } = shots
  const apply = useCallback(
    (snapshot: Snapshot) => {
      restore(snapshot.shots)
      setSettings(snapshot.settings)
      setComposition(snapshot.composition)
    },
    [restore, setSettings, setComposition],
  )

  return useHistory(document, apply)
}
