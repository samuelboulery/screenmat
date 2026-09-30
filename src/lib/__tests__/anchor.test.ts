import { describe, expect, it } from 'vitest'
import { imageRect, panShot, reanchorShots, type View } from '../anchor.ts'
import { panTravel, screenRect } from '../screen.ts'
import { computeGeometry } from '../render.ts'
import { createAnnotation } from '../annotate.ts'
import { DEFAULT_SETTINGS, type Settings, type Shot } from '../../types.ts'

const WIDE = { naturalWidth: 1400, naturalHeight: 900 } as HTMLImageElement
const TALL = { naturalWidth: 900, naturalHeight: 1950 } as HTMLImageElement

const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...patch })

const shot = (id: string, image: HTMLImageElement, patch: Partial<Shot> = {}): Shot => ({
  id,
  name: id,
  image,
  palette: { base: '#000000', accents: [] },
  layers: [],
  ...patch,
})

/** Une vue en mode séparé : chaque image dans sa propre fenêtre. */
const alone = (s: Settings, order: Shot[]): View => ({ settings: s, order, members: null })

/** Un floutage posé sur les pixels `(px, py, pw, ph)` de l'image, dans la
 *  fenêtre de `lead`. */
function redactionOver(image: HTMLImageElement, s: Settings, px: number, py: number, pw: number, ph: number, lead = image) {
  const area = imageRect(lead, image, s)
  const k = area.w / image.naturalWidth
  return createAnnotation('redaction', { x: area.x + px * k, y: area.y + py * k, w: pw * k, h: ph * k })
}

/** Les pixels de l'image que couvre un calque, sous ces réglages. */
function pixelsUnder(
  layer: { rect: { x: number; y: number; w: number; h: number } },
  image: HTMLImageElement,
  s: Settings,
  lead = image,
) {
  const area = imageRect(lead, image, s)
  const k = area.w / image.naturalWidth
  return {
    x: (layer.rect.x - area.x) / k,
    y: (layer.rect.y - area.y) / k,
    w: layer.rect.w / k,
    h: layer.rect.h / k,
  }
}

describe('imageRect', () => {
  it('couvre la fenêtre entière sans cadre', () => {
    const area = imageRect(WIDE, WIDE, settings({ frame: 'none' }))
    expect(area.x).toBeCloseTo(0, 6)
    expect(area.y).toBeCloseTo(0, 6)
    expect(area.w).toBeCloseTo(1, 6)
    expect(area.h).toBeCloseTo(900 / 1400, 6)
  })

  it('déborde de l’écran quand un ratio verrouillé rogne l’image', () => {
    const area = imageRect(TALL, TALL, settings({ frame: 'none', screenRatio: '1:1' }))
    expect(area.w).toBeCloseTo(1, 6)
    expect(area.h).toBeCloseTo(1950 / 900, 6)
    // Centrée : le débord se partage en haut et en bas.
    expect(area.y).toBeCloseTo(-(1950 / 900 - 1) / 2, 6)
  })
})

describe('reanchorShots', () => {
  const cases: Array<[string, Partial<Settings>, Partial<Settings>]> = [
    ['un changement de cadre', { frame: 'none' }, { frame: 'iphone' }],
    ['la barre de titre', { frame: 'browser', titleBar: false }, { frame: 'browser', titleBar: true }],
    ['le ratio d’appareil', { frame: 'macbook' }, { frame: 'macbook', deviceRatio: true }],
    ['le ratio d’écran', { frame: 'none' }, { frame: 'none', screenRatio: '1:1' }],
  ]

  it.each(cases)('garde un floutage sur les mêmes pixels à travers %s', (_name, from, to) => {
    const before = settings(from)
    const after = settings(to)
    const layer = redactionOver(TALL, before, 300, 800, 200, 120)
    const shots = [shot('a', TALL, { layers: [layer] })]
    const [moved] = reanchorShots(shots, alone(before, shots), alone(after, shots))
    const covered = pixelsUnder(moved.layers[0] as typeof layer, TALL, after)
    expect(covered.x).toBeCloseTo(300, 3)
    expect(covered.y).toBeCloseTo(800, 3)
    expect(covered.w).toBeCloseTo(200, 3)
    expect(covered.h).toBeCloseTo(120, 3)
  })

  it('ne touche à rien quand le réglage ne déplace pas le screenshot', () => {
    const shots = [shot('a', WIDE, { layers: [createAnnotation('box', { x: 0.1, y: 0.1, w: 0.2, h: 0.2 })] })]
    expect(reanchorShots(shots, alone(settings(), shots), alone(settings({ grain: 0.9, seed: 7 }), shots))).toBe(shots)
  })

  it('réancre chaque image du lot sur sa propre fenêtre, vue ou non', () => {
    const before = settings({ frame: 'none' })
    const after = settings({ frame: 'macbook', deviceRatio: true })
    const shots = [
      shot('a', WIDE, { layers: [redactionOver(WIDE, before, 100, 100, 50, 50)] }),
      shot('b', TALL, { layers: [redactionOver(TALL, before, 100, 1500, 50, 50)] }),
    ]
    const moved = reanchorShots(shots, alone(before, shots), alone(after, shots))
    expect(pixelsUnder(moved[1].layers[0] as never, TALL, after).y).toBeCloseTo(1500, 3)
  })

  it('suit une image très large sans borner le rapport', () => {
    // 40:1 en écran carré puis en Auto : le rapport réel est 0,025, sous le
    // plancher des poignées de groupe. Borné, le floutage découvrait sa zone.
    const BANNER = { naturalWidth: 4000, naturalHeight: 100 } as HTMLImageElement
    const before = settings({ frame: 'none', screenRatio: '1:1' })
    const after = settings({ frame: 'none' })
    const shots = [shot('a', BANNER, { layers: [redactionOver(BANNER, before, 1000, 20, 300, 40)] })]
    const [moved] = reanchorShots(shots, alone(before, shots), alone(after, shots))
    const covered = pixelsUnder(moved.layers[0] as never, BANNER, after)
    expect(covered.x).toBeCloseTo(1000, 3)
    expect(covered.w).toBeCloseTo(300, 3)
  })
})

describe('reanchorShots — la tête de la composition change', () => {
  // En combiné, la fenêtre de chaque membre prend le rapport de la première
  // image. La changer rogne les autres autrement : leurs calques doivent suivre.
  const s = settings({ frame: 'none' })
  const a = shot('a', WIDE)
  const b = shot('b', TALL, { layers: [redactionOver(TALL, s, 300, 800, 200, 120, WIDE)] })
  const combined: View = { settings: s, order: [a, b], members: ['a', 'b'] }

  const expectSamePixels = (moved: Shot[], lead: HTMLImageElement) => {
    const covered = pixelsUnder(moved.find((item) => item.id === 'b')!.layers[0] as never, TALL, s, lead)
    expect(covered.x).toBeCloseTo(300, 3)
    expect(covered.y).toBeCloseTo(800, 3)
    expect(covered.w).toBeCloseTo(200, 3)
    expect(covered.h).toBeCloseTo(120, 3)
  }

  it('quand on réordonne les images', () => {
    expectSamePixels(reanchorShots([b, a], combined, { ...combined, order: [b, a] }), TALL)
  })

  it('quand on décoche la première', () => {
    expectSamePixels(reanchorShots([a, b], combined, { ...combined, members: ['b'] }), TALL)
  })

  it('quand on passe en mode séparé, et retour', () => {
    const apart = reanchorShots([a, b], combined, { ...combined, members: null })
    expectSamePixels(apart, TALL)
    expectSamePixels(reanchorShots(apart, { ...combined, order: apart, members: null }, { ...combined, order: apart }), WIDE)
  })

  it('laisse en paix une image qui n’est pas de la composition', () => {
    const own = shot('b', TALL, { layers: [redactionOver(TALL, s, 300, 800, 200, 120)] })
    const view: View = { settings: s, order: [a, own, shot('c', WIDE)], members: ['a', 'c'] }
    const shots = [...view.order]
    expect(reanchorShots(shots, view, { ...view, members: ['c'] })).toBe(shots)
  })
})

describe('panShot', () => {
  it('emporte un floutage avec le screenshot qui glisse', () => {
    const locked = settings({ frame: 'none', screenRatio: '1:1' })
    const layer = redactionOver(TALL, locked, 300, 800, 200, 120)
    const geometry = computeGeometry(900, 1950, locked)
    const travel = panTravel(geometry.window, screenRect(geometry.window, geometry, locked), TALL)

    const moved = panShot(shot('a', TALL, { layers: [layer] }), { x: 0.5, y: 0.1 }, travel)

    expect(moved.pan).toEqual({ x: 0.5, y: 0.1 })
    const area = imageRect(TALL, TALL, locked, moved.pan)
    const k = area.w / 900
    const rect = (moved.layers[0] as typeof layer).rect
    expect((rect.x - area.x) / k).toBeCloseTo(300, 3)
    expect((rect.y - area.y) / k).toBeCloseTo(800, 3)
  })
})
