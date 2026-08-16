import { describe, expect, it } from 'vitest'
import { chromeColors } from '../frame.ts'
import { luminance } from '../color.ts'

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
