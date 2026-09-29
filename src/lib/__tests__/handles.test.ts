import { describe, expect, it } from 'vitest'
import { applyHandle, handlesFor, nudge, resizeGroup, scaleLayer } from '../handles.ts'
import type { FractionRect } from '../../types.ts'

const square: FractionRect = { x: 0.2, y: 0.2, w: 0.4, h: 0.2 }

describe('handlesFor', () => {
  it('donne huit poignées à une surface, deux bouts à un segment', () => {
    expect(handlesFor('box')).toHaveLength(8)
    expect(handlesFor('ellipse')).toHaveLength(8)
    expect(handlesFor('arrow')).toEqual(['start', 'end'])
    expect(handlesFor('line')).toEqual(['start', 'end'])
  })

  it("n'en donne aucune là où la taille vient du réglage de police", () => {
    expect(handlesFor('text')).toHaveLength(0)
    expect(handlesFor('badge')).toHaveLength(0)
  })
})

describe('applyHandle — surfaces', () => {
  it('déplace l’origine et la taille par le coin haut-gauche', () => {
    const next = applyHandle(square, 'nw', { x: 0.1, y: 0.05 }, false, 'box')
    expect(next.x).toBeCloseTo(0.3, 9)
    expect(next.y).toBeCloseTo(0.25, 9)
    expect(next.w).toBeCloseTo(0.3, 9)
    expect(next.h).toBeCloseTo(0.15, 9)
  })

  it('ne touche qu’un axe par un bord', () => {
    const next = applyHandle(square, 'e', { x: 0.1, y: 0.4 }, false, 'box')
    expect(next).toEqual({ ...square, w: 0.5 })
  })

  it('conserve les proportions avec ⇧ sur un coin', () => {
    const ratio = square.w / square.h
    const next = applyHandle(square, 'se', { x: 0.2, y: 0 }, true, 'box')
    expect(next.w / next.h).toBeCloseTo(ratio, 9)
    // Le coin opposé ne bouge pas.
    expect(next.x).toBe(square.x)
    expect(next.y).toBe(square.y)
  })

  it('ancre le coin opposé avec ⇧ sur le coin haut-gauche', () => {
    const next = applyHandle(square, 'nw', { x: 0.1, y: 0 }, true, 'box')
    expect(next.x + next.w).toBeCloseTo(square.x + square.w, 9)
    expect(next.y + next.h).toBeCloseTo(square.y + square.h, 9)
  })

  it('laisse un rectangle se retourner sans le normaliser', () => {
    const next = applyHandle(square, 'e', { x: -0.6, y: 0 }, false, 'box')
    expect(next.w).toBeCloseTo(-0.2, 9)
  })
})

describe('applyHandle — segments', () => {
  const arrow: FractionRect = { x: 0.2, y: 0.2, w: 0.3, h: 0 }

  it('tire la pointe sans bouger le départ', () => {
    const next = applyHandle(arrow, 'end', { x: -0.6, y: -0.2 }, false, 'arrow')
    expect(next.x).toBe(arrow.x)
    expect(next.y).toBe(arrow.y)
    // La flèche pointe désormais vers le haut-gauche.
    expect(next.w).toBeLessThan(0)
    expect(next.h).toBeLessThan(0)
  })

  it('tire le départ sans bouger la pointe', () => {
    const next = applyHandle(arrow, 'start', { x: 0.1, y: 0.1 }, false, 'arrow')
    expect(next.x + next.w).toBeCloseTo(arrow.x + arrow.w, 9)
    expect(next.y + next.h).toBeCloseTo(arrow.y + arrow.h, 9)
  })

  it('aimante à 45° avec ⇧, longueur conservée', () => {
    const next = applyHandle(arrow, 'end', { x: 0, y: 0.29 }, true, 'arrow')
    expect(Math.abs(next.w)).toBeCloseTo(Math.abs(next.h), 6)
    expect(Math.hypot(next.w, next.h)).toBeCloseTo(Math.hypot(0.3, 0.29), 6)
  })

  it('aimante autour de la pointe quand on tire le départ', () => {
    const next = applyHandle(arrow, 'start', { x: 0, y: -0.29 }, true, 'arrow')
    expect(next.x + next.w).toBeCloseTo(arrow.x + arrow.w, 9)
    expect(next.y + next.h).toBeCloseTo(arrow.y + arrow.h, 9)
    expect(Math.abs(next.w)).toBeCloseTo(Math.abs(next.h), 6)
  })
})

describe('nudge', () => {
  it('déplace sans redimensionner', () => {
    const next = nudge(square, 0.01, -0.01)
    expect(next.x).toBeCloseTo(0.21, 9)
    expect(next.y).toBeCloseTo(0.19, 9)
    expect(next.w).toBe(square.w)
    expect(next.h).toBe(square.h)
  })
})

describe('scaleLayer — redimensionnement d’une sélection multiple', () => {
  const from: FractionRect = { x: 0.1, y: 0.1, w: 0.4, h: 0.2 }
  const to: FractionRect = { x: 0.1, y: 0.1, w: 0.8, h: 0.4 }

  it('étire chaque rect depuis le coin fixe de la boîte englobante', () => {
    const layer = { kind: 'box', rect: { x: 0.3, y: 0.2, w: 0.2, h: 0.1 }, size: 0.01 } as const
    const next = scaleLayer(layer, from, to)
    expect(next.rect.x).toBeCloseTo(0.5, 9)
    expect(next.rect.y).toBeCloseTo(0.3, 9)
    expect(next.rect.w).toBeCloseTo(0.4, 9)
    expect(next.rect.h).toBeCloseTo(0.2, 9)
  })

  it('garde le sens d’une flèche et grossit un texte ou un badge', () => {
    const arrow = scaleLayer({ kind: 'arrow', rect: { x: 0.5, y: 0.3, w: -0.1, h: -0.1 }, size: 0.01 }, from, to)
    expect(arrow.rect.w).toBeCloseTo(-0.2, 9)
    const badge = scaleLayer({ kind: 'badge', rect: { x: 0.1, y: 0.1, w: 0, h: 0 }, size: 0.01 }, from, to)
    expect(badge.size).toBeCloseTo(0.02, 9)
  })

  it('ne retourne jamais un calque quand on tire la poignée au-delà du coin opposé', () => {
    const flipped = scaleLayer(
      { kind: 'box', rect: { x: 0.1, y: 0.1, w: 0.4, h: 0.2 }, size: 0.01 },
      from,
      { x: 0.1, y: 0.1, w: -0.4, h: -0.2 },
    )
    expect(flipped.rect.w).toBeGreaterThan(0)
  })
})

describe('resizeGroup', () => {
  it('conserve toujours les proportions de la sélection', () => {
    const next = resizeGroup(square, 'se', { x: 0.4, y: 0 })
    expect(next.w / next.h).toBeCloseTo(square.w / square.h, 9)
  })
})
