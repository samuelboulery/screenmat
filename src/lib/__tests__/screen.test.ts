import { describe, expect, it } from 'vitest'
import { computeGeometry } from '../render.ts'
import { frameRadius, panTo, panTravel, screenRect, sourceRect, windowAspect } from '../screen.ts'
import { DEFAULT_SETTINGS, type Settings } from '../../types.ts'

const WIDE = { naturalWidth: 1400, naturalHeight: 900 }
const TALL = { naturalWidth: 900, naturalHeight: 1950 }
const LYING = { naturalWidth: 1950, naturalHeight: 900 }
const FRAMES = ['browser', 'macbook', 'iphone', 'none'] as const

type Image = typeof WIDE

/** L'écran d'un cadre donné, pour une image donnée. */
function layout(image: Image, patch: Partial<Settings>, scale = 1) {
  const settings = { ...DEFAULT_SETTINGS, ...patch }
  const geometry = computeGeometry(image.naturalWidth, image.naturalHeight, settings, scale)
  const box = geometry.window
  return { settings, geometry, box, screen: screenRect(box, geometry, settings) }
}

const ratio = (rect: { width: number; height: number }) => rect.height / rect.width

describe('windowAspect — Auto', () => {
  it('donne à l’écran le rapport exact du screenshot, sur les quatre cadres', () => {
    // Avant : la fenêtre prenait le rapport de l'image, l'écran perdait deux
    // bezels, et le screenshot sortait étiré de 1 à 9 %.
    for (const frame of FRAMES) {
      for (const image of [WIDE, TALL, LYING]) {
        const { screen } = layout(image, { frame })
        expect(ratio(screen)).toBeCloseTo(image.naturalHeight / image.naturalWidth, 4)
      }
    }
  })

  it('ajoute la barre de titre au rapport du cadre navigateur', () => {
    const settings = { ...DEFAULT_SETTINGS, frame: 'browser' as const, titleBar: true }
    expect(windowAspect(1400, 900, settings)).toBeCloseTo(900 / 1400 + 0.035, 6)
  })
})

describe('windowAspect — ratio verrouillé', () => {
  it('tient un Mac en 16:10 quelle que soit l’image', () => {
    for (const image of [WIDE, TALL, LYING]) {
      expect(ratio(layout(image, { frame: 'macbook', deviceRatio: true }).screen)).toBeCloseTo(10 / 16, 4)
    }
  })

  it('tient un iPhone en 19,5:9, debout ou couché selon le screenshot', () => {
    expect(ratio(layout(TALL, { frame: 'iphone', deviceRatio: true }).screen)).toBeCloseTo(19.5 / 9, 4)
    expect(ratio(layout(WIDE, { frame: 'iphone', deviceRatio: true }).screen)).toBeCloseTo(9 / 19.5, 4)
  })

  it('tient le ratio choisi pour le navigateur, barre de titre en plus', () => {
    const { screen, box, geometry } = layout(TALL, { frame: 'browser', titleBar: true, screenRatio: '16:9' })
    expect(ratio(screen)).toBeCloseTo(9 / 16, 4)
    expect(box.height).toBeCloseTo(screen.height + geometry.titleBar, 4)
    expect(ratio(layout(WIDE, { frame: 'none', screenRatio: '1:1' }).screen)).toBeCloseTo(1, 4)
  })

  it('ignore le réglage de l’autre famille de cadres', () => {
    expect(ratio(layout(WIDE, { frame: 'macbook', screenRatio: '1:1' }).screen)).toBeCloseTo(900 / 1400, 4)
    expect(ratio(layout(WIDE, { frame: 'browser', titleBar: false, deviceRatio: true }).screen)).toBeCloseTo(900 / 1400, 4)
  })
})

describe('iPhone couché', () => {
  it('prend son bezel et son rayon sur le petit côté', () => {
    const { screen, box, geometry, settings } = layout(LYING, { frame: 'iphone' })
    expect(box.width).toBeGreaterThan(box.height)
    expect(screen.x - box.x).toBeCloseTo(0.035 * box.height, 4)
    expect(screen.y - box.y).toBeCloseTo(0.035 * box.height, 4)
    expect(frameRadius(box, geometry, settings)).toBeCloseTo(0.13 * box.height, 4)
  })

  it('ne change rien à un iPhone debout', () => {
    const { screen, box, geometry, settings } = layout(TALL, { frame: 'iphone' })
    expect(screen.x - box.x).toBeCloseTo(0.035 * box.width, 4)
    expect(frameRadius(box, geometry, settings)).toBeCloseTo(0.13 * box.width, 4)
  })
})

describe('sourceRect', () => {
  it('rend l’image entière quand elle a le rapport de l’écran', () => {
    const { screen } = layout(WIDE, { frame: 'macbook' })
    const source = sourceRect(screen, WIDE)
    expect(source.x).toBeCloseTo(0, 3)
    expect(source.y).toBeCloseTo(0, 3)
    expect(source.w).toBeCloseTo(1400, 3)
    expect(source.h).toBeCloseTo(900, 3)
  })

  it('rogne l’axe qui déborde, à la position demandée', () => {
    const { screen } = layout(WIDE, { frame: 'none', screenRatio: '1:1' })
    expect(sourceRect(screen, WIDE, { x: 0, y: 0.5 })).toEqual({ x: 0, y: 0, w: 900, h: 900 })
    expect(sourceRect(screen, WIDE).x).toBeCloseTo(250, 6)
    expect(sourceRect(screen, WIDE, { x: 1, y: 0.5 }).x).toBeCloseTo(500, 6)
  })

  it('garde une seule échelle sur les deux axes : rien n’est étiré', () => {
    const { screen } = layout(TALL, { frame: 'macbook', deviceRatio: true })
    const source = sourceRect(screen, TALL, { x: 0.5, y: 0 })
    expect(source.w / screen.width).toBeCloseTo(source.h / screen.height, 6)
    expect(source.w).toBeCloseTo(900, 6)
    expect(source.y).toBe(0)
  })

  it('ne dépend pas de l’échelle du rendu', () => {
    const one = sourceRect(layout(TALL, { frame: 'macbook', deviceRatio: true }, 1).screen, TALL)
    const three = sourceRect(layout(TALL, { frame: 'macbook', deviceRatio: true }, 3).screen, TALL)
    expect(three.y).toBeCloseTo(one.y, 3)
    expect(three.h).toBeCloseTo(one.h, 3)
  })
})

describe('panTravel', () => {
  it('mesure le débord en largeurs de fenêtre, nul sur l’axe qui tient', () => {
    const { screen, box } = layout(WIDE, { frame: 'none', screenRatio: '1:1' })
    const travel = panTravel(box, screen, WIDE)
    // Écran carré, image 1400×900 : l'image affichée fait 1400/900 de large.
    expect(travel.x).toBeCloseTo(1400 / 900 - 1, 4)
    expect(travel.y).toBeCloseTo(0, 6)
  })

  it('est nul quand rien ne dépasse', () => {
    const { screen, box } = layout(WIDE, { frame: 'iphone' })
    const travel = panTravel(box, screen, WIDE)
    expect(travel.x).toBeCloseTo(0, 4)
    expect(travel.y).toBeCloseTo(0, 4)
  })

  it('tient pour nul un débord d’arrondi, sous le demi-pixel', () => {
    // Sinon `panTo` diviserait le geste par ce presque-rien, et l'axe sauterait
    // à 0 ou 1 sans que rien ne bouge à l'écran.
    const box = { x: 0, y: 0, width: 1000, height: 500, scale: 1, rotateY: 0, shot: 0 }
    const screen = { x: 0, y: 0, width: 1000, height: 500 }
    const travel = panTravel(box, screen, { naturalWidth: 2000, naturalHeight: 1000.0004 })
    expect(travel).toEqual({ x: 0, y: 0 })
  })
})

describe('panTo', () => {
  const travel = { x: 0.5, y: 0 }

  it('suit le glisser : tirer l’image vers la droite montre sa gauche', () => {
    expect(panTo({ x: 0.5, y: 0.5 }, { x: 0.1, y: 0 }, travel).x).toBeCloseTo(0.3, 6)
  })

  it('s’arrête aux bords de l’image', () => {
    expect(panTo({ x: 0.5, y: 0.5 }, { x: 9, y: 0 }, travel).x).toBe(0)
    expect(panTo({ x: 0.5, y: 0.5 }, { x: -9, y: 0 }, travel).x).toBe(1)
  })

  it('laisse intact l’axe qui ne déborde pas', () => {
    expect(panTo({ x: 0.5, y: 0.2 }, { x: 0, y: 0.4 }, travel).y).toBe(0.2)
  })
})
