import { describe, expect, it } from 'vitest'
import { contrastRatio, inkOn } from '../color.ts'

/** Toutes les couleurs proposées par l'inspecteur, plus les accents typiques. */
const PALETTE = ['#7DE2FF', '#A378FF', '#FF9A9A', '#FFD479', '#8CE99A', '#FFFFFF']

describe('contrastRatio', () => {
  it('donne les rapports de référence WCAG', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FF9A9A', '#FF9A9A')).toBeCloseTo(1, 5)
  })
})

describe('inkOn', () => {
  it('choisit l’encre la plus contrastée, pas la plus intuitive', () => {
    expect(inkOn('#FFD479')).toBe('#07070A')
    expect(inkOn('#FFFFFF')).toBe('#07070A')
    // Un violet moyen : clair au calcul naïf, il porte pourtant du texte sombre.
    expect(inkOn('#A378FF')).toBe('#07070A')
    expect(inkOn('#07070A')).toBe('#FFFFFF')
    expect(inkOn('#3A2E8C')).toBe('#FFFFFF')
  })

  it('tient le seuil AA sur toute la palette de la DA', () => {
    for (const color of PALETTE) {
      expect(contrastRatio(color, inkOn(color))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('accepte des encres sur mesure', () => {
    expect(inkOn('#FFD479', '#101016', '#F5F5F5')).toBe('#101016')
  })
})
