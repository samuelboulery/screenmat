import { describe, expect, it } from 'vitest'
import { backgroundColors } from '../background.ts'
import { luminance } from '../color.ts'
import { saturation } from '../palette.ts'
import { mulberry32 } from '../random.ts'
import { DEFAULT_SETTINGS, type Settings } from '../../types.ts'

const withGrade = (patch: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...patch })

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
    const { fill } = backgroundColors({ base: '#f5f5f7', accents: ['#7c3aed'] }, DEFAULT_SETTINGS)
    expect(fill[2]).toBeGreaterThan(fill[1]) // dominante bleue/violette
    expect(fill[0]).toBeGreaterThan(fill[1]) // et non verte
  })

  it('assombrit fortement le fond pour un screenshot sombre', () => {
    const dark = backgroundColors({ base: '#111314', accents: ['#625ebd'] }, DEFAULT_SETTINGS)
    const light = backgroundColors({ base: '#f3f5f5', accents: ['#688098'] }, DEFAULT_SETTINGS)
    expect(luminance(dark.fill)).toBeCloseTo(0.1, 2)
    expect(luminance(light.fill)).toBeCloseTo(0.3, 2)
    expect(luminance(dark.fill)).toBeLessThan(luminance(light.fill))
  })

  it('fonctionne sans aucun accent', () => {
    const { fill, blobs } = backgroundColors({ base: '#deddd3', accents: [] }, DEFAULT_SETTINGS)
    expect(blobs.length).toBeGreaterThan(0)
    expect(luminance(fill)).toBeCloseTo(0.3, 2)
  })

  it('ne renvoie jamais de canal hors bornes', () => {
    const { fill, blobs } = backgroundColors(
      { base: '#ffffff', accents: ['#000001'] },
      withGrade({ saturation: 2, contrast: 2 }),
    )
    for (const color of [fill, ...blobs]) {
      for (const channel of color) {
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(255)
      }
    }
  })
})

describe('saturation et contraste du fond', () => {
  const PALETTE = { base: '#f5f5f7', accents: ['#7c3aed'] }

  it('neutralise les couleurs à saturation 0, sans bouger la luminance', () => {
    const flat = backgroundColors(PALETTE, withGrade({ saturation: 0 }))
    const normal = backgroundColors(PALETTE, DEFAULT_SETTINGS)

    expect(saturation(...flat.fill)).toBeCloseTo(0, 2)
    expect(luminance(flat.fill)).toBeCloseTo(luminance(normal.fill), 2)
  })

  it('renforce la saturation au-delà de 100 %', () => {
    const strong = backgroundColors(PALETTE, withGrade({ saturation: 1.8 }))
    const normal = backgroundColors(PALETTE, DEFAULT_SETTINGS)
    expect(saturation(...strong.fill)).toBeGreaterThan(saturation(...normal.fill))
  })

  it('écarte les taches de l’aplat sans déplacer l’aplat', () => {
    const gap = (contrast: number) => {
      const { fill, blobs } = backgroundColors(PALETTE, withGrade({ contrast }))
      return { fill: luminance(fill), spread: Math.abs(luminance(blobs[0]) - luminance(fill)) }
    }

    const flat = gap(0)
    const normal = gap(1)
    const hard = gap(2)

    expect(flat.spread).toBeCloseTo(0, 2)
    expect(hard.spread).toBeGreaterThan(normal.spread)
    // L'aplat est le pivot : il ne bouge pas d'un cran de contraste à l'autre.
    expect(flat.fill).toBeCloseTo(normal.fill, 2)
    expect(hard.fill).toBeCloseTo(normal.fill, 2)
  })
})
