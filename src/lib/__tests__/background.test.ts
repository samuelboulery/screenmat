import { describe, expect, it } from 'vitest'
import { backgroundColors } from '../background.ts'
import { luminance } from '../color.ts'
import { mulberry32 } from '../random.ts'

describe('mulberry32', () => {
  it('rejoue exactement la même suite pour une graine donnée', () => {
    // Sans ça, le fond de l'export ne serait pas celui de la preview.
    const a = mulberry32(7)
    const b = mulberry32(7)
    const first = Array.from({ length: 20 }, a)
    expect(Array.from({ length: 20 }, b)).toEqual(first)
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true)
  })

  it('change de suite quand la graine change', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
})

describe('backgroundColors', () => {
  it('colore le fond avec l’accent, pas avec la dominante', () => {
    // Le cas pelote : page blanche, bouton violet. Le fond doit virer au violet.
    const { fill } = backgroundColors({ base: '#f5f5f7', accents: ['#7c3aed'] })
    expect(fill[2]).toBeGreaterThan(fill[1]) // dominante bleue/violette
    expect(fill[0]).toBeGreaterThan(fill[1]) // et non verte
  })

  it('assombrit fortement le fond pour un screenshot sombre', () => {
    const dark = backgroundColors({ base: '#111314', accents: ['#625ebd'] })
    const light = backgroundColors({ base: '#f3f5f5', accents: ['#688098'] })
    expect(luminance(dark.fill)).toBeCloseTo(0.1, 2)
    expect(luminance(light.fill)).toBeCloseTo(0.3, 2)
    expect(luminance(dark.fill)).toBeLessThan(luminance(light.fill))
  })

  it('fonctionne sans aucun accent', () => {
    const { fill, blobs } = backgroundColors({ base: '#deddd3', accents: [] })
    expect(blobs.length).toBeGreaterThan(0)
    expect(luminance(fill)).toBeCloseTo(0.3, 2)
  })

  it('ne renvoie jamais de canal hors bornes', () => {
    const { fill, blobs } = backgroundColors({ base: '#ffffff', accents: ['#000001'] })
    for (const color of [fill, ...blobs]) {
      for (const channel of color) {
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(255)
      }
    }
  })
})
