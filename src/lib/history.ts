import { nodeIds } from './tree.ts'
import type { Composition, Settings, Shot } from '../types.ts'

/* Historique d'édition. Réducteur pur, sans React : c'est ce qui le rend
   testable sans navigateur. Le hook `useHistory` ne fait que l'alimenter. */

/** Ce qui s'annule : le document. La vue courante, le mode et l'échelle
 *  d'export n'en font pas partie — annuler une navigation surprendrait. */
export type Snapshot = {
  shots: Shot[]
  settings: Settings
  composition: Composition
}

export type History = {
  past: Snapshot[]
  present: Snapshot
  future: Snapshot[]
}

/** Plafond de la pile. Les `Shot` ne portent qu'une référence d'image : un
 *  instantané ne duplique aucun pixel, seulement des tableaux. */
export const HISTORY_LIMIT = 60

export function initHistory(present: Snapshot): History {
  return { past: [], present, future: [] }
}

/**
 * Signature structurelle d'un instantané : identifiants des shots et de leurs
 * calques, groupes compris. Deux états de même signature ne diffèrent que par
 * des réglages — un glissement de slider, pas une création ni une suppression.
 *
 * Les groupes comptent : sans eux, en créer un ou le dissoudre passerait pour un
 * réglage et se ferait fusionner avec l'entrée d'historique précédente.
 */
export function signature(snapshot: Snapshot): string {
  return snapshot.shots.map((shot) => `${shot.id}:${nodeIds(shot.layers).join(',')}`).join('|')
}

/**
 * Empile un nouvel état. `coalesce` fusionne avec le précédent au lieu de
 * l'empiler : un geste continu (slider, poignée) ne doit laisser qu'une entrée.
 */
export function commit(history: History, next: Snapshot, coalesce: boolean): History {
  if (next === history.present) return history
  if (coalesce) return { ...history, present: next, future: [] }

  const past = [...history.past, history.present]
  return {
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    present: next,
    future: [],
  }
}

export function canUndo(history: History): boolean {
  return history.past.length > 0
}

export function canRedo(history: History): boolean {
  return history.future.length > 0
}

export function undo(history: History): History {
  if (!canUndo(history)) return history
  const previous = history.past[history.past.length - 1]
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redo(history: History): History {
  if (!canRedo(history)) return history
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  }
}
