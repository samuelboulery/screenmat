import { describe, expect, it } from 'vitest'
import { computeGeometry } from '../render.ts'
import {
  DEFAULT_COMPOSITION,
  DEFAULT_SETTINGS,
  type Composition,
  type Settings,
} from '../../types.ts'

const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...patch })
const composition = (patch: Partial<Composition> = {}): Composition => ({
  ...DEFAULT_COMPOSITION,
  ...patch,
})

describe('computeGeometry — compositions multi-shot', () => {
  it('ne dessine qu’une fenêtre en layout single, quel que soit le nombre de shots', () => {
    const g = computeGeometry(1440, 900, settings(), 1, composition({ layout: 'single' }), 3)
    expect(g.windows).toHaveLength(1)
  })

  it('dessine autant de fenêtres que de shots dans les autres layouts', () => {
    for (const layout of ['stack', 'side', 'tilt3d'] as const) {
      const g = computeGeometry(1440, 900, settings(), 1, composition({ layout }), 3)
      expect(g.windows).toHaveLength(3)
    }
  })

  it('reste homothétique à une autre échelle, layouts compris', () => {
    // C'est LA garantie « export = preview » étendue au multi-shot.
    for (const layout of ['single', 'stack', 'side', 'tilt3d'] as const) {
      const one = computeGeometry(1440, 900, settings(), 1, composition({ layout }), 3)
      const three = computeGeometry(1440, 900, settings(), 3, composition({ layout }), 3)

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
    const g = computeGeometry(1440, 900, s, 1, composition({ layout: 'side', spread: 1 }), 3)
    const pad = s.padding * g.width

    const left = Math.min(...g.windows.map((box) => box.x))
    const right = Math.max(...g.windows.map((box) => box.x + box.width))
    const top = Math.min(...g.windows.map((box) => box.y))
    const bottom = Math.max(...g.windows.map((box) => box.y + box.height))

    expect(left).toBeGreaterThanOrEqual(pad - 0.5)
    expect(right).toBeLessThanOrEqual(g.width - pad + 0.5)
    expect(top).toBeGreaterThanOrEqual(pad - 0.5)
    expect(bottom).toBeLessThanOrEqual(g.height - pad + 0.5)
  })

  it('fait converger les fenêtres en tilt3d, symétriquement', () => {
    const g = computeGeometry(1440, 900, settings(), 1, composition({ layout: 'tilt3d', converge: 11 }), 2)
    const angles = g.windows.map((box) => box.rotateY)
    expect(angles).toContain(11)
    expect(angles).toContain(-11)
  })

  it('supprime la barre de titre quand le cadre n’est pas un navigateur', () => {
    expect(computeGeometry(1440, 900, settings({ frame: 'browser' })).titleBar).toBeGreaterThan(0)
    expect(computeGeometry(1440, 900, settings({ frame: 'iphone' })).titleBar).toBe(0)
    expect(computeGeometry(1440, 900, settings({ frame: 'none' })).titleBar).toBe(0)
  })
})
