import { describe, expect, it } from 'vitest'
import { inWindow, layerAt, windowAt } from '../hit.ts'
import { computeGeometry } from '../render.ts'
import { createAnnotation } from '../annotate.ts'
import {
  DEFAULT_COMPOSITION,
  DEFAULT_PLACEMENT,
  DEFAULT_SETTINGS,
  type Composition,
  type LayerNode,
  type Scene,
  type Shot,
} from '../../types.ts'

/* Ce que le pointeur désigne. Le hit-test décide à quel shot un geste
   appartient : s'il se trompe de fenêtre, l'annotation atterrit sur le mauvais
   screenshot, et rien dans le rendu ne le signale. */

const palette = { base: '#101018', accents: ['#7DE2FF'] }

const shot = (id: string, layers: LayerNode[] = []): Shot => ({
  id,
  name: id,
  image: {} as HTMLImageElement,
  palette,
  layers,
})

const scene = (shots: Shot[], composition: Partial<Composition> = {}): Scene => ({
  shots,
  palette,
  settings: DEFAULT_SETTINGS,
  composition: { ...DEFAULT_COMPOSITION, ...composition },
})

/** La géométrie que la preview aurait calculée pour cette scène. */
const geometryFor = (s: Scene) =>
  computeGeometry(
    1440,
    900,
    s.settings,
    1,
    s.composition,
    s.shots.map(() => DEFAULT_PLACEMENT),
  )

/** Un point au centre de la n-ième fenêtre, en px canvas. */
function centerOf(geometry: ReturnType<typeof geometryFor>, index: number) {
  const box = geometry.windows[index]
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

describe('inWindow', () => {
  it('est l’inverse exact de la rotation de la fenêtre', () => {
    const s = scene([shot('a'), shot('b')], { layout: 'tilt3d' })
    const box = geometryFor(s).windows[0]
    const point = { x: box.x + 40, y: box.y + 25 }

    // Sur une fenêtre inclinée, l'aller-retour doit retomber sur ses pieds :
    // c'est ce qui garantit que le point sous le curseur est le bon.
    const local = inWindow(box, point)
    expect(local.x).not.toBeCloseTo(point.x, 6)
    expect(inWindow({ ...box, rotateY: 0 }, point)).toEqual(point)
  })
})

describe('windowAt', () => {
  it('rend la fenêtre qui contient le point', () => {
    const s = scene([shot('a'), shot('b')], { layout: 'side' })
    const geometry = geometryFor(s)

    expect(windowAt(s, geometry, centerOf(geometry, 0))?.shotId).toBe(
      s.shots[geometry.windows[0].shot].id,
    )
    expect(windowAt(s, geometry, centerOf(geometry, 1))?.shotId).toBe(
      s.shots[geometry.windows[1].shot].id,
    )
  })

  it('retombe sur le shot sélectionné quand le point est dans le vide', () => {
    const s = scene([shot('a'), shot('b')], { layout: 'side' })
    const geometry = geometryFor(s)
    const nowhere = { x: -5000, y: -5000 }

    // Un tracé commencé hors des fenêtres doit atterrir quelque part, sinon le
    // geste se perd sans rien dire.
    expect(windowAt(s, geometry, nowhere, 'b')?.shotId).toBe('b')
    expect(windowAt(s, geometry, nowhere, 'a')?.shotId).toBe('a')
  })

  it('retombe sur le premier shot sans sélection', () => {
    const s = scene([shot('a'), shot('b')], { layout: 'side' })
    expect(windowAt(s, geometryFor(s), { x: -5000, y: -5000 })?.shotId).toBe('a')
  })

  it('rend null sans géométrie', () => {
    const s = scene([shot('a')])
    expect(windowAt(s, null, { x: 0, y: 0 })).toBeNull()
  })
})

describe('layerAt', () => {
  const boxAt = (rect: { x: number; y: number; w: number; h: number }) =>
    createAnnotation('box', rect)

  it('trouve le calque sous le pointeur', () => {
    const layer = boxAt({ x: 0.2, y: 0.2, w: 0.4, h: 0.3 })
    const s = scene([shot('a', [layer])])
    const geometry = geometryFor(s)
    const box = geometry.windows[0]

    const inside = { x: box.x + box.width * 0.4, y: box.y + box.width * 0.35 }
    expect(layerAt(s, geometry, inside)?.annotation.id).toBe(layer.id)
  })

  it('ignore un calque masqué ou verrouillé — c’est tout l’intérêt du cadenas', () => {
    const rect = { x: 0.2, y: 0.2, w: 0.4, h: 0.3 }
    const geometry = geometryFor(scene([shot('a')]))
    const box = geometry.windows[0]
    const inside = { x: box.x + box.width * 0.4, y: box.y + box.width * 0.35 }

    for (const flag of ['hidden', 'locked'] as const) {
      const s = scene([shot('a', [{ ...boxAt(rect), [flag]: true }])])
      expect(layerAt(s, geometryFor(s), inside)).toBeNull()
    }
  })

  it('rend null loin de tout calque', () => {
    const s = scene([shot('a', [boxAt({ x: 0.2, y: 0.2, w: 0.1, h: 0.1 })])])
    expect(layerAt(s, geometryFor(s), { x: -5000, y: -5000 })).toBeNull()
  })
})
