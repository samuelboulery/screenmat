import { describe, expect, it } from 'vitest'
import {
  badgeNumbers,
  bounds,
  createAnnotation,
  hitTest,
  normalizeRect,
  toFractions,
  toPixels,
} from '../annotate.ts'
import { applyMatrix, invertMatrix, windowMatrix } from '../frame.ts'
import type { WindowBox } from '../render.ts'
import type { Annotation, AnnotationKind, FractionRect } from '../../types.ts'

const box = (patch: Partial<WindowBox> = {}): WindowBox => ({
  x: 100,
  y: 80,
  width: 1200,
  height: 800,
  rotateY: 0,
  shot: 0,
  ...patch,
})

const make = (kind: AnnotationKind, rect: FractionRect, patch: Partial<Annotation> = {}) => ({
  ...createAnnotation(kind, rect),
  ...patch,
})

describe('matrice de fenêtre', () => {
  it('est sa propre inverse, aller et retour', () => {
    for (const rotateY of [0, 16, -12]) {
      const window = box({ rotateY })
      const matrix = windowMatrix(window)
      const back = invertMatrix(matrix)
      const point = { x: 640, y: 420 }
      const round = applyMatrix(back, applyMatrix(matrix, point))

      expect(round.x).toBeCloseTo(point.x, 6)
      expect(round.y).toBeCloseTo(point.y, 6)
    }
  })

  it('laisse le centre de la fenêtre en place', () => {
    const window = box({ rotateY: 16 })
    const center = { x: window.x + window.width / 2, y: window.y + window.height / 2 }
    const moved = applyMatrix(windowMatrix(window), center)

    expect(moved.x).toBeCloseTo(center.x, 6)
    expect(moved.y).toBeCloseTo(center.y, 6)
  })
})

describe('coordonnées', () => {
  it('sont relatives à la fenêtre, aller et retour', () => {
    const window = box()
    const rect = { x: 0.25, y: 0.1, w: -0.3, h: 0.2 }
    const round = toFractions(toPixels(rect, window), window)

    expect(round.x).toBeCloseTo(rect.x, 9)
    expect(round.y).toBeCloseTo(rect.y, 9)
    expect(round.w).toBeCloseTo(rect.w, 9)
    expect(round.h).toBeCloseTo(rect.h, 9)
  })

  it('placent l’origine au coin de la fenêtre, pas du canvas', () => {
    const window = box()
    expect(toPixels({ x: 0, y: 0, w: 0, h: 0 }, window)).toEqual({
      x: window.x,
      y: window.y,
      w: 0,
      h: 0,
    })
  })

  it('suivent la fenêtre quand elle bouge', () => {
    const rect = { x: 0.5, y: 0.25, w: 0.1, h: 0.1 }
    const moved = toPixels(rect, box({ x: 300 }))
    expect(moved.x).toBe(300 + 0.5 * 1200)
  })
})

describe('bounds', () => {
  it('normalise un tracé fait vers le haut-gauche', () => {
    const window = box()
    const arrow = make('arrow', { x: 0.5, y: 0.5, w: -0.2, h: -0.1 })
    const area = bounds(arrow, window)

    expect(area.w).toBeGreaterThan(0)
    expect(area.h).toBeGreaterThan(0)
    // La flèche déborde de son segment par sa tête.
    expect(area.x).toBeLessThan(toPixels(arrow.rect, window).x)
  })

  it('suit la taille de police d’un label, pas le rectangle du tracé', () => {
    const window = box()
    const small = make('text', { x: 0.1, y: 0.1, w: 0.9, h: 0.9 }, { text: 'Hello', size: 0.01 })
    const large = { ...small, size: 0.03 }

    expect(bounds(large, window).w).toBeGreaterThan(bounds(small, window).w)
    expect(bounds(small, window).w).toBeLessThan(0.9 * window.width)
  })

  it('reste attrapable pour un label posé d’un clic', () => {
    // `isPoint` couvre le texte : son rect ne porte que son ancre, `w` et `h`
    // sont nuls et sa boîte vient entièrement de son texte.
    const label = make('text', { x: 0.3, y: 0.3, w: 0, h: 0 }, { text: 'Étape 1' })
    const area = bounds(label, box())

    expect(area.w).toBeGreaterThan(0)
    expect(area.h).toBeGreaterThan(0)
  })

  it('donne un carré au badge, quel que soit le tracé', () => {
    const badge = make('badge', { x: 0.2, y: 0.2, w: 0, h: 0 })
    const area = bounds(badge, box())
    expect(area.w).toBeCloseTo(area.h, 9)
    expect(area.w).toBeGreaterThan(0)
  })
})

describe('normalizeRect', () => {
  it('retourne un rectangle à dimensions positives', () => {
    expect(normalizeRect({ x: 10, y: 10, w: -6, h: -4 })).toEqual({ x: 4, y: 6, w: 6, h: 4 })
  })
})

describe('hitTest', () => {
  const window = box()

  it('trouve une flèche tracée à l’envers, sur son trait', () => {
    const arrow = make('arrow', { x: 0.5, y: 0.5, w: -0.4, h: -0.4 })
    const start = toPixels(arrow.rect, window)
    const middle = { x: start.x + start.w / 2, y: start.y + start.h / 2 }

    expect(hitTest([arrow], middle, window)?.id).toBe(arrow.id)
  })

  it('ignore le coin vide de la boîte d’une flèche diagonale', () => {
    const arrow = make('arrow', { x: 0.1, y: 0.1, w: 0.5, h: 0.5 })
    const start = toPixels(arrow.rect, window)
    // Coin opposé au trait : dans l'AABB, mais loin du segment.
    expect(hitTest([arrow], { x: start.x + start.w, y: start.y }, window)).toBeNull()
  })

  it('rend le calque le plus récent quand ils se recouvrent', () => {
    const under = make('box', { x: 0.1, y: 0.1, w: 0.5, h: 0.5 })
    const over = make('box', { x: 0.2, y: 0.2, w: 0.2, h: 0.2 })
    const point = toPixels({ x: 0.25, y: 0.25, w: 0, h: 0 }, window)

    expect(hitTest([under, over], point, window)?.id).toBe(over.id)
  })
})

describe('badgeNumbers', () => {
  it('numérote par rang et renumérote après une suppression', () => {
    const first = make('badge', { x: 0.1, y: 0.1, w: 0, h: 0 })
    const second = make('badge', { x: 0.2, y: 0.2, w: 0, h: 0 })
    const third = make('badge', { x: 0.3, y: 0.3, w: 0, h: 0 })
    const label = make('text', { x: 0, y: 0, w: 0.1, h: 0.1 })

    expect(badgeNumbers([first, label, second, third]).get(third.id)).toBe(3)
    expect(badgeNumbers([label, second, third]).get(second.id)).toBe(1)
    expect(badgeNumbers([label, second, third]).get(third.id)).toBe(2)
  })
})

describe('createAnnotation', () => {
  it('remplit toutes les propriétés visuelles', () => {
    const annotation = createAnnotation('box', { x: 0, y: 0, w: 0.2, h: 0.2 })
    expect(annotation.color).toMatch(/^#/)
    expect(annotation.strokeWidth).toBeGreaterThan(0)
    expect(annotation.opacity).toBe(1)
    expect(annotation.fill).toBe(0)
  })
})
