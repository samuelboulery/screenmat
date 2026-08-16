import { describe, expect, it } from 'vitest'
import { harmonizePalettes, hue, quantize, saturation, toHex } from '../palette.ts'
import { hexToRgb, luminance } from '../color.ts'

type Rgba = [number, number, number, number]

/** Construit un buffer RGBA à partir d'une liste de couleurs répétées. */
function pixels(...runs: Array<{ color: Rgba; count: number }>): number[] {
  return runs.flatMap(({ color, count }) => Array.from({ length: count }, () => color).flat())
}

const WHITE: Rgba = [245, 245, 247, 255]
const PURPLE: Rgba = [124, 58, 237, 255]
const RED: Rgba = [225, 29, 72, 255]
const GREY: Rgba = [136, 138, 140, 255]

describe('utilitaires couleur', () => {
  it('convertit et borne les canaux', () => {
    expect(toHex(124, 58, 237)).toBe('#7c3aed')
    expect(toHex(-10, 300, 0)).toBe('#00ff00')
  })

  it('mesure saturation et teinte', () => {
    expect(saturation(255, 255, 255)).toBe(0)
    expect(saturation(255, 0, 0)).toBe(1)
    expect(saturation(0, 0, 0)).toBe(0)
    expect(hue(255, 0, 0)).toBe(0)
    expect(hue(0, 255, 0)).toBeCloseTo(120, 6)
    expect(hue(0, 0, 255)).toBeCloseTo(240, 6)
  })
})

describe('quantize', () => {
  it('rend la couleur dominante en base', () => {
    const palette = quantize(pixels({ color: PURPLE, count: 100 }))
    expect(palette.base).toBe('#7c3aed')
    expect(palette.accents[0]).toBe('#7c3aed')
  })

  it('fait remonter un accent minoritaire devant un aplat neutre immense', () => {
    // Le cas pelote.pages.dev : page blanche, bouton violet. C'est le violet qui
    // doit colorer le fond, pas le blanc.
    const palette = quantize(
      pixels({ color: WHITE, count: 3800 }, { color: PURPLE, count: 200 }),
    )
    expect(palette.base).toBe('#f5f5f7')
    expect(palette.accents).toHaveLength(1)
    expect(palette.accents[0]).toBe('#7c3aed')
  })

  it('trie les accents par population × saturation', () => {
    const palette = quantize(
      pixels({ color: WHITE, count: 3000 }, { color: RED, count: 400 }, { color: PURPLE, count: 100 }),
    )
    expect(palette.accents).toEqual(['#e11d48', '#7c3aed'])
  })

  it('ne renvoie aucun accent sur une image neutre, mais garde une base', () => {
    // Le cas siccus : beige et gris, rien de franchement coloré.
    const palette = quantize(pixels({ color: GREY, count: 500 }, { color: WHITE, count: 500 }))
    expect(palette.accents).toEqual([])
    expect(palette.base).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('ignore les pixels transparents et retombe sur le repli', () => {
    const palette = quantize(pixels({ color: [124, 58, 237, 0], count: 100 }))
    expect(palette.base).toBe('#16191c')
    expect(palette.accents).toEqual([])
  })

  it('écarte les pixels saturés mais quasi noirs', () => {
    const palette = quantize(pixels({ color: [20, 4, 30, 255], count: 500 }))
    expect(palette.accents).toEqual([])
  })

  it('écarte les gris sombres du chrome des applis dark', () => {
    // rgb(40,46,52) affiche 0,23 de saturation pour 12 points d'écart seulement.
    // Sans seuil de chroma absolu, ce gris passait devant le vrai accent.
    const palette = quantize(
      pixels({ color: [40, 46, 52, 255], count: 3000 }, { color: [77, 97, 35, 255], count: 120 }),
    )
    expect(palette.accents).toEqual(['#4d6123'])
  })

  it('garde un accent désaturé mais franchement teinté', () => {
    // Le bleu-gris d'accessipote : 0,30 de saturation, 44 points d'écart.
    const palette = quantize(
      pixels({ color: [243, 245, 245, 255], count: 3000 }, { color: [102, 125, 146, 255], count: 300 }),
    )
    expect(palette.accents).toEqual(['#667d92'])
  })

  it('plafonne le nombre d’accents à quatre', () => {
    const palette = quantize(
      pixels(
        { color: [255, 0, 0, 255], count: 100 },
        { color: [0, 255, 0, 255], count: 90 },
        { color: [0, 0, 255, 255], count: 80 },
        { color: [255, 255, 0, 255], count: 70 },
        { color: [0, 255, 255, 255], count: 60 },
        { color: [255, 0, 255, 255], count: 50 },
      ),
    )
    expect(palette.accents).toHaveLength(4)
  })

  it('fusionne deux accents quasi identiques venus de bacs voisins', () => {
    const palette = quantize(
      pixels(
        { color: [102, 128, 152, 255], count: 300 },
        { color: [102, 128, 151, 255], count: 280 },
        { color: [225, 29, 72, 255], count: 200 },
      ),
    )
    expect(palette.accents).toHaveLength(2)
    expect(palette.accents[1]).toBe('#e11d48')
  })

  it('supporte un buffer vide', () => {
    expect(quantize([])).toEqual({ base: '#16191c', accents: [] })
  })
})

describe('harmonizePalettes', () => {
  const measure = (hex: string) => {
    const rgb = hexToRgb(hex)
    return { saturation: saturation(...rgb), luminance: luminance(rgb), hue: hue(...rgb) }
  }

  it('aligne saturation et luminance du lot en gardant chaque teinte', () => {
    // Un bleu pâle et un orange très saturé et sombre : deux ambiances
    // étrangères, qui doivent sortir de même intensité.
    const before = [{ base: '#c8d8f0', accents: [] }, { base: '#8a4a08', accents: [] }]
    const after = harmonizePalettes(before)

    const first = measure(after[0].base)
    const second = measure(after[1].base)

    expect(first.saturation).toBeCloseTo(second.saturation, 2)
    expect(first.luminance).toBeCloseTo(second.luminance, 2)
    expect(first.hue).toBeCloseTo(measure(before[0].base).hue, 0)
    expect(second.hue).toBeCloseTo(measure(before[1].base).hue, 0)
  })

  it('donne aux accents leur propre cible, distincte de celle des bases', () => {
    const after = harmonizePalettes([
      { base: '#f0f0f2', accents: ['#7c3aed'] },
      { base: '#101014', accents: ['#e11d48'] },
    ])

    expect(measure(after[0].accents[0]).luminance).toBeCloseTo(
      measure(after[1].accents[0]).luminance,
      2,
    )
    expect(measure(after[0].accents[0]).luminance).not.toBeCloseTo(
      measure(after[0].base).luminance,
      2,
    )
  })

  it('laisse un gris gris — pas de teinte à inventer, pas de division par zéro', () => {
    const [grey] = harmonizePalettes([{ base: '#888888', accents: [] }])
    const rgb = hexToRgb(grey.base)
    expect(saturation(...rgb)).toBe(0)
  })

  it('laisse une palette seule inchangée', () => {
    const only = { base: '#7c3aed', accents: ['#e11d48'] }
    const [after] = harmonizePalettes([only])
    expect(measure(after.base).hue).toBeCloseTo(measure(only.base).hue, 0)
    expect(measure(after.base).luminance).toBeCloseTo(measure(only.base).luminance, 2)
  })

  it('supporte un lot vide et des palettes sans accent', () => {
    expect(harmonizePalettes([])).toEqual([])
    expect(harmonizePalettes([{ base: '#7c3aed', accents: [] }])[0].accents).toEqual([])
  })
})
