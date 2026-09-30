import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetToolStyles, parseToolStyle, rememberToolStyle, toolStyle } from '../tool-style.ts'

/** `localStorage` n'existe pas sous Node : un faux minimal, remis à zéro. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage())
  forgetToolStyles()
})

afterEach(() => vi.unstubAllGlobals())

describe('parseToolStyle', () => {
  it('ne garde que les champs de style, validés', () => {
    const style = parseToolStyle('badge', { color: '#FF0000', size: 0.02, text: 'secret', rect: { x: 1 } })
    expect(style).toEqual({ color: '#FF0000', size: 0.02 })
  })

  it('ramène une valeur invalide au défaut du type', () => {
    const style = parseToolStyle('arrow', { color: 'javascript:alert(1)', strokeWidth: 99 })
    expect(style.color).toBe('#FFD479')
    expect(style.strokeWidth).toBeLessThanOrEqual(0.012)
  })

  it('rend un style vide pour autre chose qu’un objet', () => {
    expect(parseToolStyle('box', 'nope')).toEqual({})
    expect(parseToolStyle('box', null)).toEqual({})
  })
})

describe('rememberToolStyle', () => {
  it('retient le style d’un type sans toucher aux autres', () => {
    rememberToolStyle('badge', { color: '#FF0000' })
    rememberToolStyle('badge', { size: 0.02 })
    expect(toolStyle('badge')).toEqual({ color: '#FF0000', size: 0.02 })
    expect(toolStyle('arrow')).toEqual({})
  })

  it('ignore un patch qui ne porte aucun champ de style', () => {
    rememberToolStyle('text', { text: 'bonjour', rect: { x: 0, y: 0, w: 0, h: 0 } })
    expect(toolStyle('text')).toEqual({})
  })

  it('retient la forme d’un floutage, le fond et le contour d’une forme', () => {
    rememberToolStyle('redaction', { redactionShape: 'ellipse' })
    rememberToolStyle('box', { fillColor: '#00FF00', fill: 1, stroke: false, strokeOpacity: 0.5 })
    expect(toolStyle('redaction')).toEqual({ redactionShape: 'ellipse' })
    expect(toolStyle('box')).toEqual({ fillColor: '#00FF00', fill: 1, stroke: false, strokeOpacity: 0.5 })
  })

  it('survit à un rechargement', () => {
    rememberToolStyle('box', { color: '#00FF00' })
    forgetToolStyles()
    expect(toolStyle('box')).toEqual({ color: '#00FF00' })
  })

  it('relit un stockage corrompu comme vide', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'screenmat:tool-styles': '{pas du json' }))
    forgetToolStyles()
    expect(toolStyle('box')).toEqual({})
  })

  it('ne réécrit pas ce qu’un stockage abîmé contenait', () => {
    const storage = fakeStorage({
      'screenmat:tool-styles': JSON.stringify({ badge: { color: 'nope', junk: 1 }, weird: 3 }),
    })
    vi.stubGlobal('localStorage', storage)
    forgetToolStyles()
    rememberToolStyle('arrow', { color: '#FF0000' })
    const stored = JSON.parse(storage.getItem('screenmat:tool-styles') ?? '')
    expect(stored.weird).toBeUndefined()
    expect(stored.badge.junk).toBeUndefined()
    expect(stored.badge.color).toBe('#FFD479')
    expect(stored.arrow).toEqual({ color: '#FF0000' })
  })

  it('ne prend pas un champ indéfini pour un choix', () => {
    rememberToolStyle('box', { color: '#00FF00' })
    rememberToolStyle('box', { color: undefined, opacity: 0.5 })
    expect(toolStyle('box')).toEqual({ color: '#00FF00', opacity: 0.5 })
  })

  it('n’écrase pas ce qu’un autre onglet vient d’enregistrer', () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    expect(toolStyle('box')).toEqual({})
    storage.setItem('screenmat:tool-styles', JSON.stringify({ badge: { color: '#FF0000' } }))
    rememberToolStyle('box', { color: '#00FF00' })
    expect(JSON.parse(storage.getItem('screenmat:tool-styles') ?? '').badge).toEqual({ color: '#FF0000' })
  })

  it('tient sans stockage', () => {
    vi.stubGlobal('localStorage', undefined)
    forgetToolStyles()
    rememberToolStyle('box', { color: '#00FF00' })
    expect(toolStyle('box')).toEqual({ color: '#00FF00' })
  })
})
