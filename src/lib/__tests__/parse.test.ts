import { describe, expect, it } from 'vitest'
import { bool, clamp, isRecord, num, oneOf } from '../parse.ts'

/* La couche sous `parseStyle` et `parseScene` : les deux frontières par
   lesquelles une donnée externe entre dans le projet. Ce qui compte n'est pas
   qu'elle calcule juste sur une entrée saine, c'est qu'elle ne laisse rien
   passer sur une entrée hostile. */

describe('num', () => {
  it('laisse passer un nombre fini', () => {
    expect(num(3.5, 0)).toBe(3.5)
    expect(num(0, 7)).toBe(0)
    expect(num(-2, 7)).toBe(-2)
  })

  it('retombe sur le défaut devant un non-fini', () => {
    // Un JSON ne porte pas Infinity, mais un objet construit par une machine si :
    // `parseScene` reçoit des valeurs, pas forcément du texte.
    expect(num(NaN, 7)).toBe(7)
    expect(num(Infinity, 7)).toBe(7)
    expect(num(-Infinity, 7)).toBe(7)
  })

  it('ne convertit pas — un nombre en texte reste un refus', () => {
    expect(num('3', 7)).toBe(7)
    expect(num(null, 7)).toBe(7)
    expect(num(undefined, 7)).toBe(7)
    expect(num({}, 7)).toBe(7)
  })
})

describe('oneOf', () => {
  const kinds = ['mesh', 'gradient', 'solid'] as const

  it('accepte une valeur de la liste', () => {
    expect(oneOf('gradient', kinds, 'mesh')).toBe('gradient')
  })

  it('refuse tout le reste, y compris une casse voisine', () => {
    expect(oneOf('Gradient', kinds, 'mesh')).toBe('mesh')
    expect(oneOf('rien', kinds, 'mesh')).toBe('mesh')
    expect(oneOf(0, kinds, 'mesh')).toBe('mesh')
    expect(oneOf(null, kinds, 'mesh')).toBe('mesh')
  })
})

describe('isRecord', () => {
  it('reconnaît un objet nu', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ a: 1 })).toBe(true)
  })

  it('écarte null et les tableaux', () => {
    // `typeof null === 'object'` et un tableau aussi : les deux pièges du
    // contrôle naïf, et les deux formes qu'un JSON produit sans effort.
    expect(isRecord(null)).toBe(false)
    expect(isRecord([])).toBe(false)
    expect(isRecord([{ a: 1 }])).toBe(false)
    expect(isRecord('x')).toBe(false)
  })
})

describe('bool', () => {
  it('n’accepte qu’un vrai booléen', () => {
    expect(bool(true, false)).toBe(true)
    expect(bool(false, true)).toBe(false)
    expect(bool('true', false)).toBe(false)
    expect(bool(1, false)).toBe(false)
    expect(bool(null, true)).toBe(true)
  })
})

describe('clamp', () => {
  it('borne des deux côtés, bornes incluses', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })
})
