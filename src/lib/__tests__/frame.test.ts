import { describe, expect, it } from 'vitest'
import { chromeColors, screenRect } from '../frame.ts'
import { luminance } from '../color.ts'
import { computeGeometry } from '../render.ts'
import { DEFAULT_SETTINGS, type Settings } from '../../types.ts'

const LIGHT = { base: '#f3f5f5', accents: ['#688098'] }
const DARK = { base: '#111314', accents: ['#625ebd'] }
const WARM = { base: '#deddd3', accents: [] }

describe('chromeColors', () => {
  it('déduit un chrome clair d’un screenshot clair, sombre d’un sombre', () => {
    expect(luminance(chromeColors(LIGHT, 'auto').bar)).toBeGreaterThan(0.8)
    expect(luminance(chromeColors(DARK, 'auto').bar)).toBeLessThan(0.2)
  })

  it('respecte la surcharge manuelle', () => {
    expect(luminance(chromeColors(DARK, 'light').bar)).toBeGreaterThan(0.8)
    expect(luminance(chromeColors(LIGHT, 'dark').bar)).toBeLessThan(0.2)
  })

  it('garde la température du screenshot plutôt qu’un gris neutre', () => {
    // La barre de siccus doit être un blanc chaud, pas un blanc froid.
    const warm = chromeColors(WARM, 'light').bar
    expect(warm[0]).toBeGreaterThan(warm[2])

    const cool = chromeColors(LIGHT, 'light').bar
    expect(cool[2]).toBeGreaterThanOrEqual(cool[0])
  })

  it('contraste toujours le texte avec la pilule', () => {
    for (const palette of [LIGHT, DARK, WARM]) {
      for (const theme of ['auto', 'light', 'dark'] as const) {
        const { pill, text } = chromeColors(palette, theme)
        expect(Math.abs(luminance(pill) - luminance(text))).toBeGreaterThan(0.25)
      }
    }
  })
})

describe('screenRect', () => {
  /** Le rectangle du screenshot pour un cadre donné, avec l'image de référence. */
  const rect = (patch: Partial<Settings>) => {
    const settings = { ...DEFAULT_SETTINGS, ...patch }
    const geometry = computeGeometry(1400, 900, settings)
    return { screen: screenRect(geometry.window, geometry, settings), geometry }
  }

  it('descend le screenshot sous la barre de titre du cadre navigateur', () => {
    const { screen, geometry } = rect({ frame: 'browser', titleBar: true })
    expect(geometry.titleBar).toBeGreaterThan(0)
    expect(screen.y - geometry.window.y).toBeCloseTo(geometry.titleBar, 6)
    expect(screen.width).toBeCloseTo(geometry.window.width, 6)
    expect(screen.height).toBeCloseTo(geometry.window.height - geometry.titleBar, 6)
  })

  it('remplit la fenêtre entière quand il n’y a ni barre ni bezel', () => {
    for (const patch of [{ frame: 'none' } as const, { frame: 'browser', titleBar: false } as const]) {
      const { screen, geometry } = rect(patch)
      expect(screen).toEqual({
        x: geometry.window.x,
        y: geometry.window.y,
        width: geometry.window.width,
        height: geometry.window.height,
      })
    }
  })

  it('rentre le screenshot dans le bezel des cadres d’appareil', () => {
    // C'est ce que `inspect()` ignorait quand il recalculait son propre repère :
    // une annotation placée en pixels tombait à côté sur macbook et iphone.
    for (const frame of ['macbook', 'iphone'] as const) {
      const { screen, geometry } = rect({ frame })
      const bezel = screen.x - geometry.window.x
      expect(bezel).toBeGreaterThan(0)
      expect(screen.y - geometry.window.y).toBeCloseTo(bezel, 6)
      expect(screen.width).toBeCloseTo(geometry.window.width - 2 * bezel, 6)
      expect(screen.height).toBeCloseTo(geometry.window.height - 2 * bezel, 6)
    }
    // L'iphone a le bezel le plus large des deux.
    expect(rect({ frame: 'iphone' }).screen.x).toBeGreaterThan(rect({ frame: 'macbook' }).screen.x)
  })

  it('reste homothétique d’une échelle à l’autre', () => {
    const settings = { ...DEFAULT_SETTINGS, frame: 'macbook' as const }
    const one = computeGeometry(1400, 900, settings, 1)
    const three = computeGeometry(1400, 900, settings, 3)
    const a = screenRect(one.window, one, settings)
    const b = screenRect(three.window, three, settings)
    expect(b.width / a.width).toBeCloseTo(3, 3)
    expect(b.height / a.height).toBeCloseTo(3, 3)
  })
})
