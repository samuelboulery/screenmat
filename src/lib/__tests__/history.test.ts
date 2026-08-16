import { describe, expect, it } from 'vitest'
import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  commit,
  initHistory,
  redo,
  signature,
  undo,
  type Snapshot,
} from '../history.ts'
import { createAnnotation } from '../annotate.ts'
import { DEFAULT_COMPOSITION, DEFAULT_SETTINGS, type Annotation, type Shot } from '../../types.ts'

const shot = (id: string, annotations: Annotation[] = []): Shot => ({
  id,
  name: id,
  image: {} as HTMLImageElement,
  palette: { base: '#101014', accents: [] },
  annotations,
})

const snapshot = (patch: Partial<Snapshot> = {}): Snapshot => ({
  shots: [shot('a')],
  settings: DEFAULT_SETTINGS,
  composition: DEFAULT_COMPOSITION,
  ...patch,
})

describe('commit', () => {
  it('empile l’état précédent et vide le futur', () => {
    const first = snapshot()
    const second = snapshot({ settings: { ...DEFAULT_SETTINGS, padding: 0.1 } })

    const history = commit(initHistory(first), second, false)
    expect(history.past).toEqual([first])
    expect(history.present).toBe(second)
    expect(history.future).toHaveLength(0)
  })

  it('fusionne au lieu d’empiler quand on coalesce', () => {
    const first = snapshot()
    const second = snapshot({ settings: { ...DEFAULT_SETTINGS, padding: 0.1 } })
    const third = snapshot({ settings: { ...DEFAULT_SETTINGS, padding: 0.12 } })

    const history = commit(commit(initHistory(first), second, true), third, true)
    expect(history.past).toHaveLength(0)
    expect(history.present).toBe(third)
  })

  it('jette les entrées les plus anciennes au-delà du plafond', () => {
    let history = initHistory(snapshot())
    for (let index = 0; index < HISTORY_LIMIT + 10; index += 1) {
      history = commit(history, snapshot({ settings: { ...DEFAULT_SETTINGS, seed: index } }), false)
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT)
  })

  it('ignore un état identique', () => {
    const only = snapshot()
    const history = initHistory(only)
    expect(commit(history, only, false)).toBe(history)
  })
})

describe('undo / redo', () => {
  const first = snapshot()
  const second = snapshot({ settings: { ...DEFAULT_SETTINGS, padding: 0.1 } })

  it('restitue l’état précédent, puis le remet', () => {
    const history = commit(initHistory(first), second, false)

    const back = undo(history)
    expect(back.present).toBe(first)
    expect(canRedo(back)).toBe(true)

    expect(redo(back).present).toBe(second)
  })

  it('ne fait rien au fond de la pile', () => {
    const history = initHistory(first)
    expect(canUndo(history)).toBe(false)
    expect(undo(history)).toBe(history)
    expect(redo(history)).toBe(history)
  })

  it('efface le futur dès qu’une nouvelle action arrive', () => {
    const third = snapshot({ settings: { ...DEFAULT_SETTINGS, padding: 0.2 } })
    const back = undo(commit(initHistory(first), second, false))

    expect(commit(back, third, false).future).toHaveLength(0)
  })
})

describe('signature', () => {
  it('change quand un calque apparaît, pas quand il est réglé', () => {
    const layer = createAnnotation('box', { x: 0, y: 0, w: 0.2, h: 0.2 })
    const withLayer = snapshot({ shots: [shot('a', [layer])] })
    const restyled = snapshot({ shots: [shot('a', [{ ...layer, color: '#FF0000' }])] })
    const withTwo = snapshot({
      shots: [shot('a', [layer, createAnnotation('arrow', { x: 0, y: 0, w: 0.1, h: 0.1 })])],
    })

    expect(signature(restyled)).toBe(signature(withLayer))
    expect(signature(withTwo)).not.toBe(signature(withLayer))
  })
})
