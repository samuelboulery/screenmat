import { describe, expect, it, vi } from 'vitest'
import { shortcuts, handleBare, type KeyEvent, type Shortcuts } from '../../hooks/useShortcuts.ts'
import { TOOLS, TOOL_KEYS } from '../tools.ts'

const press = (key: string, shiftKey = false): KeyEvent => ({
  key,
  shiftKey,
  metaKey: false,
  ctrlKey: false,
  preventDefault: () => {},
})

const handlers = (): Shortcuts => ({
  onExport: vi.fn(),
  onCopy: vi.fn(),
  onShuffle: vi.fn(),
  onScale: vi.fn(),
  onDelete: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onDuplicate: vi.fn(),
  onEscape: vi.fn(),
  onNudge: vi.fn(),
  onLayerMove: vi.fn(),
  onSelectAll: vi.fn(),
  onGroup: vi.fn(),
  onUngroup: vi.fn(),
  onHelp: vi.fn(),
})

describe('raccourcis', () => {
  it('ouvre le panneau sur ?', () => {
    const shortcuts = handlers()
    handleBare(press('?', true), shortcuts)
    expect(shortcuts.onHelp).toHaveBeenCalledOnce()
  })

  it('garde R pour la Box et ⇧R pour le fond', () => {
    const shortcuts = handlers()
    handleBare(press('r'), shortcuts)
    expect(shortcuts.onShuffle).not.toHaveBeenCalled()
    handleBare(press('R', true), shortcuts)
    expect(shortcuts.onShuffle).toHaveBeenCalledOnce()
  })

  it('ne donne jamais deux sens à une même touche du panneau', () => {
    const keys = [
      ...TOOLS.map((tool) => TOOL_KEYS[tool]),
      ...shortcuts().flatMap((group) => group.items.map((item) => item.keys)),
    ]
    expect(new Set(keys).size).toBe(keys.length)
  })
})
