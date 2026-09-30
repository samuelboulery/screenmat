import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLang, m, resolveLang, setLang, subscribe } from '../i18n/index.ts'
import { keyLabel, keycaps } from '../keys.ts'
import { shortcuts } from '../../hooks/useShortcuts.ts'
import { TOOLS, TOOL_KEYS, toolTitle } from '../tools.ts'

afterEach(() => setLang('en'))

describe('resolveLang', () => {
  it('garde le choix mémorisé, quel que soit le navigateur', () => {
    expect(resolveLang('en', ['fr-FR'])).toBe('en')
    expect(resolveLang('fr', ['en-US'])).toBe('fr')
  })

  it('suit la première langue du navigateur sans choix valide', () => {
    expect(resolveLang(null, ['fr-CA', 'en'])).toBe('fr')
    expect(resolveLang(null, ['en-GB', 'fr'])).toBe('en')
    expect(resolveLang('de', ['fr'])).toBe('fr')
  })

  it('retombe sur l’anglais quand le navigateur ne dit rien', () => {
    expect(resolveLang(null, [])).toBe('en')
  })
})

describe('setLang', () => {
  it('change ce que lit `m`, et le dit aux abonnés', () => {
    const heard = vi.fn()
    const stop = subscribe(heard)
    expect(toolTitle('SEL')).toBe('Select')

    setLang('fr')
    expect(getLang()).toBe('fr')
    expect(toolTitle('SEL')).toBe(m.core.tools.SEL)
    expect(toolTitle('SEL')).not.toBe('Select')
    expect(heard).toHaveBeenCalledOnce()

    stop()
    setLang('en')
    expect(heard).toHaveBeenCalledOnce()
  })
})

describe('touches en français', () => {
  const caps = (keys: string, mac: boolean) =>
    keycaps(keys, mac).map((part) => (part.kind === 'word' ? `(${part.text})` : part.caps.map((cap) => cap.text).join('+')))

  it('nomme les touches et les gestes dans la langue, la table ne bouge pas', () => {
    setLang('fr')
    expect(caps('Esc', true)).toEqual(['Échap'])
    expect(caps('Space drag', true)).toEqual(['Espace', '(glisser)'])
    expect(caps('Double-click', true)).toEqual(['(Double-clic)'])
    expect(caps('⇧⌘Z', false)).toEqual(['Ctrl+Maj+Z'])
    expect(caps('⌫', false)).toEqual(['Suppr'])
    expect(keyLabel('Dissocier (⇧⌘G)', false)).toBe('Dissocier (Ctrl+Maj+G)')
  })

  it('garde une touche par sens dans les deux langues', () => {
    for (const lang of ['en', 'fr'] as const) {
      setLang(lang)
      const keys = [...TOOLS.map((tool) => TOOL_KEYS[tool]), ...shortcuts().flatMap((group) => group.items.map((item) => item.keys))]
      expect(new Set(keys).size).toBe(keys.length)
      for (const item of shortcuts().flatMap((group) => group.items)) expect(item.label.length).toBeGreaterThan(0)
    }
  })
})
