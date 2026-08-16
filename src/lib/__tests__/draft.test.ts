import { describe, expect, it } from 'vitest'
import { MIN_DRAW, draftRect } from '../draft.ts'

const from = { x: 100, y: 100 }

describe('draftRect', () => {
  it('rend un rect nul pour les formes posées d’un clic', () => {
    for (const kind of ['badge', 'text'] as const) {
      expect(draftRect(kind, from, from, false)).toEqual({ x: 100, y: 100, w: 0, h: 0 })
    }
  })

  it('refuse un geste trop court pour valoir un calque', () => {
    const short = { x: from.x + MIN_DRAW - 1, y: from.y }
    expect(draftRect('box', from, short, false)).toBeNull()
    expect(draftRect('arrow', from, short, false)).toBeNull()
  })

  it('garde le signe d’un segment : une flèche pointe dans les quatre quadrants', () => {
    const rect = draftRect('arrow', from, { x: 40, y: 30 }, false)
    expect(rect).toEqual({ x: 100, y: 100, w: -60, h: -70 })
  })

  it('⇧ aimante un segment aux multiples de 45°, longueur conservée', () => {
    const cases: Array<[{ x: number; y: number }, number]> = [
      [{ x: 300, y: 108 }, 0],
      [{ x: 300, y: 92 }, 0],
      [{ x: 108, y: 300 }, 90],
      [{ x: 300, y: 290 }, 45],
      [{ x: 100 - 200, y: 100 + 190 }, 135],
    ]

    for (const [to, degrees] of cases) {
      const rect = draftRect('line', from, to, true)!
      const angle = (Math.atan2(rect.h, rect.w) * 180) / Math.PI
      expect(Math.abs(angle)).toBeCloseTo(degrees, 6)
      expect(Math.hypot(rect.w, rect.h)).toBeCloseTo(Math.hypot(to.x - from.x, to.y - from.y), 6)
    }
  })

  it('⇧ carre une surface, dans le quadrant du geste', () => {
    const square = draftRect('box', from, { x: 260, y: 190 }, true)
    expect(square).toEqual({ x: 100, y: 100, w: 160, h: 160 })

    // Tracé vers le haut-gauche : le carré part de l'angle opposé.
    const back = draftRect('box', from, { x: 40, y: 20 }, true)
    expect(back).toEqual({ x: 20, y: 20, w: 80, h: 80 })
  })

  it('sans ⇧, la surface suit exactement le geste et se normalise', () => {
    expect(draftRect('ellipse', from, { x: 40, y: 300 }, false)).toEqual({
      x: 40,
      y: 100,
      w: 60,
      h: 200,
    })
  })
})
