import { describe, expect, it } from 'vitest'
import { computeGeometry } from '../render.ts'
import { frameRadius, screenRect } from '../frame.ts'
import {
  DEFAULT_COMPOSITION,
  DEFAULT_PLACEMENT,
  DEFAULT_SETTINGS,
  type Composition,
  type Placement,
  type Settings,
} from '../../types.ts'

const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...patch })
const composition = (patch: Partial<Composition> = {}): Composition => ({
  ...DEFAULT_COMPOSITION,
  ...patch,
})

/** `n` shots sans retouche — ce que la composition seule produit. */
const shots = (n: number): Placement[] => Array.from({ length: n }, () => DEFAULT_PLACEMENT)

/** Centre de la boîte des fenêtres, en px canvas. */
function boundsOf(windows: readonly { x: number; y: number; width: number; height: number }[]) {
  const left = Math.min(...windows.map((box) => box.x))
  const right = Math.max(...windows.map((box) => box.x + box.width))
  const top = Math.min(...windows.map((box) => box.y))
  const bottom = Math.max(...windows.map((box) => box.y + box.height))
  return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 }
}

describe('computeGeometry — compositions multi-shot', () => {
  it('ne dessine qu’une fenêtre en layout single, quel que soit le nombre de shots', () => {
    const g = computeGeometry(1440, 900, settings(), 1, composition({ layout: 'single' }), shots(3))
    expect(g.windows).toHaveLength(1)
  })

  it('dessine autant de fenêtres que de shots dans les autres layouts', () => {
    for (const layout of ['stack', 'side', 'tilt3d'] as const) {
      const g = computeGeometry(1440, 900, settings(), 1, composition({ layout }), shots(3))
      expect(g.windows).toHaveLength(3)
    }
  })

  it('reste homothétique à une autre échelle, layouts compris', () => {
    // C'est LA garantie « export = preview » étendue au multi-shot.
    for (const layout of ['single', 'stack', 'side', 'tilt3d'] as const) {
      const one = computeGeometry(1440, 900, settings(), 1, composition({ layout }), shots(3))
      const three = computeGeometry(1440, 900, settings(), 3, composition({ layout }), shots(3))

      expect(three.width).toBe(one.width * 3)
      expect(three.height).toBeCloseTo(one.height * 3, 0)
      expect(three.windows).toHaveLength(one.windows.length)

      one.windows.forEach((box, index) => {
        const scaled = three.windows[index]
        expect(scaled.x).toBeCloseTo(box.x * 3, 4)
        expect(scaled.y).toBeCloseTo(box.y * 3, 4)
        expect(scaled.width).toBeCloseTo(box.width * 3, 4)
        expect(scaled.height).toBeCloseTo(box.height * 3, 4)
        expect(scaled.rotateY).toBe(box.rotateY)
      })
    }
  })

  it('garde toute la composition dans la boîte marginée', () => {
    const s = settings({ ratio: '16:9', padding: 0.065 })
    const g = computeGeometry(1440, 900, s, 1, composition({ layout: 'side', spread: 1 }), shots(3))
    const pad = s.padding * g.width
    const { left, right, top, bottom } = boundsOf(g.windows)

    expect(left).toBeGreaterThanOrEqual(pad - 0.5)
    expect(right).toBeLessThanOrEqual(g.width - pad + 0.5)
    expect(top).toBeGreaterThanOrEqual(pad - 0.5)
    expect(bottom).toBeLessThanOrEqual(g.height - pad + 0.5)
  })

  it('fait converger les fenêtres en tilt3d, symétriquement', () => {
    const g = computeGeometry(1440, 900, settings(), 1, composition({ layout: 'tilt3d', converge: 11 }), shots(2))
    const angles = g.windows.map((box) => box.rotateY)
    expect(angles).toContain(11)
    expect(angles).toContain(-11)
  })


  it('centre la composition sur sa boîte englobante, pas sur son origine', () => {
    // Le bug d'origine : une pile, dont les décalages ne vont que vers le haut
    // et la gauche, se dessinait basse et à droite d'un demi-décalage.
    for (const layout of ['stack', 'tilt3d'] as const) {
      for (const count of [2, 4]) {
        const g = computeGeometry(1440, 900, settings(), 1, composition({ layout }), shots(count))
        const { cx, cy } = boundsOf(g.windows)
        expect(cx).toBeCloseTo(g.width / 2, 4)
        expect(cy).toBeCloseTo(g.height / 2, 4)
      }
    }
  })

  it('décale la composition entière avec offsetY', () => {
    const base = computeGeometry(1440, 900, settings(), 1, composition({ layout: 'stack' }), shots(2))
    const moved = computeGeometry(
      1440,
      900,
      settings(),
      1,
      composition({ layout: 'stack', offsetY: 0.1 }),
      shots(2),
    )
    const shift = 0.1 * base.window.width

    expect(boundsOf(moved.windows).cy - boundsOf(base.windows).cy).toBeCloseTo(shift, 4)
    expect(boundsOf(moved.windows).cx).toBeCloseTo(boundsOf(base.windows).cx, 4)
  })

  it('replie side en grille : 4 shots en 2×2, 5 shots avec la dernière rangée centrée', () => {
    const four = computeGeometry(1440, 900, settings(), 1, composition({ layout: 'side' }), shots(4))
    const rows = new Set(four.windows.map((box) => Math.round(box.y)))
    const columns = new Set(four.windows.map((box) => Math.round(box.x)))
    expect(rows.size).toBe(2)
    expect(columns.size).toBe(2)

    const five = computeGeometry(
      1440,
      900,
      settings(),
      1,
      composition({ layout: 'side', columns: 3 }),
      shots(5),
    )
    const ys = [...new Set(five.windows.map((box) => Math.round(box.y)))].sort((a, b) => a - b)
    expect(ys).toHaveLength(2)
    const last = five.windows.filter((box) => Math.round(box.y) === ys[1])
    expect(last).toHaveLength(2)
    // La paire du bas est centrée sur elle-même, pas alignée à gauche du trio.
    expect(boundsOf(last).cx).toBeCloseTo(five.width / 2, 4)
  })

  it('empile deux shots dans un canvas portrait, les pose côte à côte en paysage', () => {
    const portrait = computeGeometry(
      1440,
      900,
      settings({ ratio: '9:16' }),
      1,
      composition({ layout: 'side' }),
      shots(2),
    )
    expect(new Set(portrait.windows.map((box) => Math.round(box.x))).size).toBe(1)

    const landscape = computeGeometry(
      1440,
      900,
      settings({ ratio: '16:9' }),
      1,
      composition({ layout: 'side' }),
      shots(2),
    )
    expect(new Set(landscape.windows.map((box) => Math.round(box.y))).size).toBe(1)
  })

  it('force les colonnes quand columns est posé', () => {
    const g = computeGeometry(
      1440,
      900,
      settings({ ratio: '16:9' }),
      1,
      composition({ layout: 'side', columns: 1 }),
      shots(3),
    )
    expect(new Set(g.windows.map((box) => Math.round(box.x))).size).toBe(1)
    expect(new Set(g.windows.map((box) => Math.round(box.y))).size).toBe(3)
  })

  it('applique le placement d’un shot sans toucher aux autres', () => {
    const layout = composition({ layout: 'side' })
    const base = computeGeometry(1440, 900, settings(), 1, layout, shots(2))
    const moved = computeGeometry(1440, 900, settings(), 1, layout, [
      { scale: 0.5, dx: 0.2, dy: -0.1 },
      DEFAULT_PLACEMENT,
    ])

    const first = moved.windows.find((box) => box.shot === 0)!
    const second = moved.windows.find((box) => box.shot === 1)!
    expect(first.width).toBeCloseTo(second.width / 2, 4)
    expect(first.scale).toBe(0.5)

    // La fenêtre voisine ne bouge pas d'un pixel : le cadrage et le centrage
    // ignorent les retouches, sans quoi glisser un shot ferait dériver les
    // autres sous le curseur.
    const untouched = base.windows.find((box) => box.shot === 1)!
    expect(second.x).toBeCloseTo(untouched.x, 6)
    expect(second.y).toBeCloseTo(untouched.y, 6)
    expect(second.width).toBeCloseTo(untouched.width, 6)

    // Et la fenêtre retouchée, elle, s'est bien déplacée du décalage demandé.
    const origin = base.windows.find((box) => box.shot === 0)!
    expect(first.x + first.width / 2 - (origin.x + origin.width / 2)).toBeCloseTo(
      0.2 * untouched.width,
      4,
    )
  })

  it('donne à une fenêtre réduite une barre de titre et un rayon à son échelle', () => {
    const g = computeGeometry(
      1440,
      900,
      settings({ frame: 'browser', titleBar: true }),
      1,
      composition({ layout: 'side' }),
      [{ scale: 0.5, dx: 0, dy: 0 }, DEFAULT_PLACEMENT],
    )
    const small = g.windows.find((box) => box.shot === 0)!
    const full = g.windows.find((box) => box.shot === 1)!
    const s = settings({ frame: 'browser', titleBar: true })

    // `screenRect` reste la source unique : c'est elle qu'on interroge, pas une
    // trigonométrie reposée dans le test.
    expect(screenRect(small, g, s).y - small.y).toBeCloseTo(
      (screenRect(full, g, s).y - full.y) / 2,
      6,
    )
    expect(frameRadius(small, g, s)).toBeCloseTo(frameRadius(full, g, s) / 2, 6)
  })

  it('supprime la barre de titre quand le cadre n’est pas un navigateur', () => {
    expect(computeGeometry(1440, 900, settings({ frame: 'browser' })).titleBar).toBeGreaterThan(0)
    expect(computeGeometry(1440, 900, settings({ frame: 'iphone' })).titleBar).toBe(0)
    expect(computeGeometry(1440, 900, settings({ frame: 'none' })).titleBar).toBe(0)
  })
})
