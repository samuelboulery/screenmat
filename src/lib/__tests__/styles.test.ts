import { describe, expect, it } from 'vitest'
import { parseStyle } from '../styles.ts'
import { DEFAULT_SETTINGS } from '../../types.ts'

const wrap = (style: unknown) => JSON.stringify({ kind: 'shotframe-style', version: 1, style })

describe('parseStyle', () => {
  it('refuse ce qui n’est pas un style shotframe', () => {
    expect(() => parseStyle('pas du json')).toThrow(/JSON/)
    expect(() => parseStyle('{"kind":"autre-chose"}')).toThrow(/style shotframe/)
    expect(() => parseStyle(JSON.stringify({ kind: 'shotframe-style' }))).toThrow()
  })

  it('relit un style complet', () => {
    const style = parseStyle(
      wrap({ name: 'Docs', settings: { ...DEFAULT_SETTINGS, padding: 0.1, frame: 'macbook' } }),
    )
    expect(style.name).toBe('Docs')
    expect(style.settings.padding).toBeCloseTo(0.1)
    expect(style.settings.frame).toBe('macbook')
  })

  it('retombe sur les valeurs par défaut plutôt que de copier des données hostiles', () => {
    const style = parseStyle(
      wrap({
        name: '',
        settings: { padding: 'énorme', ratio: '__proto__', frame: 'alien', seed: Number.NaN },
      }),
    )
    expect(style.name).toBe('Imported')
    expect(style.settings.padding).toBe(DEFAULT_SETTINGS.padding)
    expect(style.settings.ratio).toBe(DEFAULT_SETTINGS.ratio)
    expect(style.settings.frame).toBe(DEFAULT_SETTINGS.frame)
    expect(style.settings.seed).toBe(DEFAULT_SETTINGS.seed)
  })

  it('borne les valeurs numériques hors plage', () => {
    const style = parseStyle(wrap({ name: 'x', settings: { padding: 99, grain: -4, blur: 1e6 } }))
    expect(style.settings.padding).toBe(0.3)
    expect(style.settings.grain).toBe(0)
    expect(style.settings.blur).toBe(32)
  })

  it('ignore une palette mal formée mais garde une palette valide', () => {
    expect(parseStyle(wrap({ name: 'x', palette: { base: 'rouge' } })).palette).toBeUndefined()
    expect(
      parseStyle(wrap({ name: 'x', palette: { base: '#112233', accents: ['#445566', 'nope'] } }))
        .palette,
    ).toEqual({ base: '#112233', accents: ['#445566'] })
  })

  it('n’accepte comme watermark qu’une dataURL d’image', () => {
    expect(parseStyle(wrap({ name: 'x', watermark: { dataUrl: 'https://evil.example/a.png' } })).watermark)
      .toBeUndefined()
    expect(parseStyle(wrap({ name: 'x', watermark: { dataUrl: 'javascript:alert(1)' } })).watermark)
      .toBeUndefined()

    const ok = parseStyle(
      wrap({ name: 'x', watermark: { dataUrl: 'data:image/png;base64,AAAA', position: 'top-left' } }),
    )
    expect(ok.watermark?.position).toBe('top-left')
  })
})
