import { describe, expect, it } from 'vitest'
import { BASE_WIDTH, TITLE_BAR, computeGeometry } from '../render.ts'
import { DEFAULT_SETTINGS, type Settings } from '../../types.ts'

const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...patch })

describe('computeGeometry', () => {
  it('produit un canvas au format demandé', () => {
    const g = computeGeometry(1440, 900, settings({ ratio: '4:3' }))
    expect(g.width).toBe(BASE_WIDTH)
    expect(g.height).toBe(1200)

    const square = computeGeometry(1440, 900, settings({ ratio: '1:1' }))
    expect(square.height).toBe(BASE_WIDTH)
  })

  it("est l'homothétique exact de lui-même à une autre échelle", () => {
    // C'est LA garantie « export = preview ». Si ce test casse, l'export ment.
    const one = computeGeometry(1440, 900, settings(), 1)
    const three = computeGeometry(1440, 900, settings(), 3)

    expect(three.width).toBe(one.width * 3)
    expect(three.height).toBeCloseTo(one.height * 3, 0)
    expect(three.window.x).toBeCloseTo(one.window.x * 3, 6)
    expect(three.window.y).toBeCloseTo(one.window.y * 3, 6)
    expect(three.window.width).toBeCloseTo(one.window.width * 3, 6)
    expect(three.window.height).toBeCloseTo(one.window.height * 3, 6)
    expect(three.titleBar).toBeCloseTo(one.titleBar * 3, 6)
    expect(three.radius).toBeCloseTo(one.radius * 3, 6)
  })

  it('respecte la marge quand la fenêtre est limitée par la largeur', () => {
    const s = settings({ ratio: '4:3', padding: 0.065 })
    const g = computeGeometry(1440, 900, s)
    expect(g.window.width).toBeCloseTo(BASE_WIDTH - 2 * 0.065 * BASE_WIDTH, 6)
    expect(g.window.x).toBeCloseTo(0.065 * BASE_WIDTH, 6)
  })

  it('bascule sur la hauteur pour une image en portrait', () => {
    const g = computeGeometry(900, 1600, settings({ ratio: '4:3' }))
    // Contenue en hauteur : la fenêtre ne touche plus les bords latéraux.
    expect(g.window.height).toBeCloseTo(g.height - 2 * 0.065 * BASE_WIDTH, 6)
    expect(g.window.width).toBeLessThan(BASE_WIDTH - 2 * 0.065 * BASE_WIDTH)
    expect(g.window.x).toBeGreaterThan(0.065 * BASE_WIDTH)
  })

  it('réserve la barre de titre, et rien quand elle est masquée', () => {
    // La barre n'existe que dans le cadre navigateur, qui n'est plus le défaut.
    const withBar = computeGeometry(1440, 900, settings({ frame: 'browser', titleBar: true }))
    expect(withBar.titleBar).toBeCloseTo(TITLE_BAR * withBar.window.width, 6)
    // L'image occupe le reste, à son rapport d'origine.
    expect((withBar.window.height - withBar.titleBar) / withBar.window.width).toBeCloseTo(900 / 1440, 6)

    const without = computeGeometry(1440, 900, settings({ titleBar: false }))
    expect(without.titleBar).toBe(0)
    expect(without.window.height / without.window.width).toBeCloseTo(900 / 1440, 6)
  })

  it('en format auto, la hauteur du canvas suit celle de l’image', () => {
    const s = settings({ ratio: 'auto', padding: 0.065, titleBar: false })
    const g = computeGeometry(1000, 500, s)
    const pad = 0.065 * BASE_WIDTH
    expect(g.window.width).toBeCloseTo(BASE_WIDTH - 2 * pad, 6)
    expect(g.height).toBe(Math.round(g.window.width / 2 + 2 * pad))
  })

  it('ne produit jamais de dimension nulle avec une marge extrême', () => {
    const g = computeGeometry(1440, 900, settings({ padding: 0.5 }))
    expect(g.window.width).toBeGreaterThan(0)
    expect(g.window.height).toBeGreaterThan(0)
  })
})
