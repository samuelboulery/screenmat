import { describe, expect, it } from 'vitest'
import { createAnnotation } from '../annotate.ts'
import { resizeText } from '../handles.ts'
import { layoutText, shadowFor, type Measure } from '../text.ts'
import type { WindowBox } from '../render.ts'

const box = { x: 0, y: 0, width: 1000, height: 800, scale: 1 } as WindowBox
/** Mesure déterministe : 10 px par caractère, quelle que soit la police. */
const measure: Measure = (text) => text.length * 10

const label = (text: string, extra: object = {}) => ({
  ...createAnnotation('text', { x: 0.1, y: 0.1, w: 0, h: 0 }),
  text,
  ...extra,
})

describe('layoutText', () => {
  it('coupe aux retours à la ligne et mesure la plus longue ligne', () => {
    const layout = layoutText(label('abc\nabcdef'), box, measure)
    expect(layout.lines.map((line) => line.text)).toEqual(['abc', 'abcdef'])
    expect(layout.width).toBe(60 + layout.padX * 2)
  })

  it('replie les mots quand une largeur est fixée', () => {
    const annotation = label('aa bb cc', { rect: { x: 0, y: 0, w: 0.1, h: 0 } })
    const layout = layoutText(annotation, box, measure)
    // 100 px de large, moins 2 × 12 px de marge : « aa bb » tient, « cc » passe dessous.
    expect(layout.lines.map((line) => line.text)).toEqual(['aa bb', 'cc'])
    expect(layout.width).toBeCloseTo(100, 9)
  })

  it('garde l’offset de chaque ligne dans le texte d’origine, pour le caret', () => {
    const layout = layoutText(label('ab\ncd'), box, measure)
    expect(layout.lines.map((line) => line.start)).toEqual([0, 3])
  })

  it('n’a plus de marge quand le fond est coupé', () => {
    const annotation = label('abc', { background: { ...label('').background, on: false } })
    expect(layoutText(annotation, box, measure).padX).toBe(0)
  })

  it('grandit avec la fenêtre : la mise en page est homothétique', () => {
    const big = { ...box, width: 3000 }
    const scaled = (text: string) => text.length * 30
    expect(layoutText(label('abc'), big, scaled).height).toBeCloseTo(layoutText(label('abc'), box, measure).height * 3, 9)
  })
})

describe('shadowFor', () => {
  it('est homothétique : même ombre à 1× et à 3×, au facteur près', () => {
    const one = shadowFor(0.6, box)
    const three = shadowFor(0.6, { ...box, width: box.width * 3 })
    expect(three?.blur).toBeCloseTo((one?.blur ?? 0) * 3, 9)
    expect(three?.offsetY).toBeCloseTo((one?.offsetY ?? 0) * 3, 9)
  })

  it('n’existe pas à zéro', () => {
    expect(shadowFor(0, box)).toBeNull()
  })
})

describe('resizeText', () => {
  it('fixe la largeur de retour à la ligne par le bord droit', () => {
    const annotation = label('hello world')
    const free = layoutText(annotation, box, measure).width / box.width
    const patch = resizeText(annotation, 'e', { x: -0.02, y: 0 }, box, measure)
    expect(patch.rect?.w).toBeCloseTo(free - 0.02, 9)
    expect(patch.rect?.x).toBe(annotation.rect.x)
  })

  it('garde le bord droit en place quand on tire le gauche', () => {
    const annotation = label('hello world')
    const free = layoutText(annotation, box, measure).width / box.width
    const patch = resizeText(annotation, 'w', { x: 0.02, y: 0 }, box, measure)
    expect((patch.rect?.x ?? 0) + (patch.rect?.w ?? 0)).toBeCloseTo(annotation.rect.x + free, 9)
  })

  it('grossit le texte par le coin, largeur fixée comprise', () => {
    const annotation = label('hello', { rect: { x: 0.1, y: 0.1, w: 0.2, h: 0 } })
    const height = layoutText(annotation, box, measure).height / box.width
    const patch = resizeText(annotation, 'se', { x: 0, y: height }, box, measure)
    expect(patch.size).toBeCloseTo(annotation.size * 2, 9)
    expect(patch.rect?.w).toBeCloseTo(0.4, 9)
  })
})
