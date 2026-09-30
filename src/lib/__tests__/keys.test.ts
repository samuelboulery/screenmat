import { describe, expect, it } from 'vitest'
import { SHORTCUTS } from '../../hooks/useShortcuts.ts'
import { isMac, keyLabel, keycaps, type KeyPart } from '../keys.ts'
import { TOOLS, TOOL_KEYS } from '../tools.ts'

const ALL = [...TOOLS.map((tool) => TOOL_KEYS[tool]), ...SHORTCUTS.flatMap((group) => group.items.map((item) => item.keys))]

const caps = (parts: KeyPart[]) => parts.map((part) => (part.kind === 'word' ? `(${part.text})` : part.caps.map((cap) => cap.text).join('+')))

describe('keycaps', () => {
  it('découpe un accord en une capsule par touche', () => {
    expect(caps(keycaps('⇧⌘Z', true))).toEqual(['⇧+⌘+Z'])
    expect(caps(keycaps('⌘↑ ⌘↓', true))).toEqual(['⌘+↑', '⌘+↓'])
    expect(caps(keycaps('← ↑ → ↓', true))).toEqual(['←', '↑', '→', '↓'])
  })

  it('écrit les modificateurs en toutes lettres hors Mac, Ctrl en tête', () => {
    expect(caps(keycaps('⇧⌘Z', false))).toEqual(['Ctrl+Shift+Z'])
    expect(caps(keycaps('⌘↑ ⌘↓', false))).toEqual(['Ctrl+↑', 'Ctrl+↓'])
    expect(caps(keycaps('⌫', false))).toEqual(['Del'])
  })

  it('laisse un geste en clair, à côté de sa touche', () => {
    expect(caps(keycaps('⌥ drag', true))).toEqual(['⌥', '(drag)'])
    expect(caps(keycaps('⌥ drag', false))).toEqual(['Alt', '(drag)'])
    expect(caps(keycaps('Space drag', true))).toEqual(['Space', '(drag)'])
    expect(caps(keycaps('Double-click', true))).toEqual(['(Double-click)'])
    expect(caps(keycaps('Esc', true))).toEqual(['Esc'])
  })

  it('marque les symboles, qui prennent une police où ils existent', () => {
    const [chord] = keycaps('⇧⌘Z', true)
    expect(chord.kind === 'chord' && chord.caps.map((cap) => cap.glyph)).toEqual([true, true, false])
  })

  it.each([true, false])('ne perd aucune touche de la table (mac : %s)', (mac) => {
    for (const keys of ALL) {
      const parts = keycaps(keys, mac)
      expect(parts.length).toBeGreaterThan(0)
      for (const part of parts) {
        if (part.kind === 'chord') expect(part.caps.every((cap) => cap.text.length > 0)).toBe(true)
      }
      // Sur Mac, recoller les capsules redonne la chaîne de la table.
      if (mac) expect(parts.map((part) => (part.kind === 'word' ? part.text : part.caps.map((cap) => cap.text).join(''))).join(' ')).toBe(keys)
    }
  })

  it('ne montre aucun symbole Mac hors Mac', () => {
    for (const keys of ALL) {
      expect(caps(keycaps(keys, false)).join(' ')).not.toMatch(/[⌘⇧⌥⌫]/)
    }
  })
})

describe('keyLabel', () => {
  it('rend le texte tel quel sur Mac', () => {
    expect(keyLabel('Export this image (⌘E)', true)).toBe('Export this image (⌘E)')
  })

  it('réécrit les touches d’une phrase hors Mac', () => {
    expect(keyLabel('Export this image (⌘E)', false)).toBe('Export this image (Ctrl+E)')
    expect(keyLabel('Ungroup (⇧⌘G)', false)).toBe('Ungroup (Ctrl+Shift+G)')
    expect(keyLabel('Send backward (⌘↓)', false)).toBe('Send backward (Ctrl+↓)')
    expect(keyLabel('Delete (⌫)', false)).toBe('Delete (Del)')
    expect(keyLabel('⌥-drag to move', false)).toBe('Alt-drag to move')
    expect(keyLabel('Nudge — ⇧ for ×5', false)).toBe('Nudge — Shift for ×5')
  })
})

describe('isMac', () => {
  it('lit la plateforme, `userAgentData` d’abord', () => {
    expect(isMac({ platform: 'MacIntel' })).toBe(true)
    expect(isMac({ platform: 'Win32' })).toBe(false)
    expect(isMac({ platform: 'Linux x86_64', userAgentData: { platform: 'macOS' } })).toBe(true)
    expect(isMac({ platform: 'iPhone' })).toBe(true)
  })

  it('suppose un Mac quand rien ne le dit', () => {
    // La table est écrite en symboles Mac : sans information, on la montre telle quelle.
    expect(isMac(undefined)).toBe(true)
  })

  it('retombe sur `platform` quand `userAgentData` se tait', () => {
    // Un Chromium qui masque sa plateforme la rend vide, pas absente.
    expect(isMac({ platform: 'MacIntel', userAgentData: { platform: '' } })).toBe(true)
    expect(isMac({ platform: 'Win32', userAgentData: { platform: '' } })).toBe(false)
  })
})
