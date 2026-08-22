import { describe, expect, it } from 'vitest'
import { parseScene } from '../spec.ts'
import { ANNOTATION_LIMITS } from '../annotate.ts'
import { DEFAULT_COMPOSITION, DEFAULT_PLACEMENT, DEFAULT_SETTINGS } from '../../types.ts'

const minimal = { shots: [{ input: 'a.png' }] }

describe('parseScene — forme du document', () => {
  it('refuse ce qui n’est pas du JSON', () => {
    expect(() => parseScene('{')).toThrow(/JSON/)
  })

  it('refuse une scène sans shot', () => {
    expect(() => parseScene({ shots: [] })).toThrow(/shot/)
    expect(() => parseScene({})).toThrow(/shot/)
  })

  it('écarte un shot sans `input` plutôt que de fabriquer un chemin', () => {
    expect(() => parseScene({ shots: [{ name: 'orphelin' }] })).toThrow(/shot/)
  })

  it('accepte une chaîne comme un objet déjà parsé', () => {
    expect(parseScene(JSON.stringify(minimal)).shots[0]?.input).toBe('a.png')
    expect(parseScene(minimal).shots[0]?.input).toBe('a.png')
  })
})

describe('parseScene — réglages', () => {
  it('retombe sur les défauts quand rien n’est fourni', () => {
    const scene = parseScene(minimal)
    expect(scene.settings).toEqual(DEFAULT_SETTINGS)
    expect(scene.composition).toEqual(DEFAULT_COMPOSITION)
    expect(scene.scale).toBe(2)
  })

  it('borne une échelle absurde sur la valeur par défaut', () => {
    expect(parseScene({ ...minimal, scale: 12 }).scale).toBe(2)
    expect(parseScene({ ...minimal, scale: 3 }).scale).toBe(3)
  })

  it('ignore un réglage de type faux sans faire tomber la scène', () => {
    const scene = parseScene({ ...minimal, settings: { padding: 'beaucoup', seed: 7 } })
    expect(scene.settings.padding).toBe(DEFAULT_SETTINGS.padding)
    expect(scene.settings.seed).toBe(7)
  })
})

describe('parseScene — composition et placement', () => {
  const withComposition = (composition: unknown) => parseScene({ ...minimal, composition })

  it('borne les colonnes et le décalage vertical', () => {
    expect(withComposition({ columns: 42 }).composition.columns).toBe(8)
    expect(withComposition({ columns: -3 }).composition.columns).toBe(0)
    expect(withComposition({ columns: 2.6 }).composition.columns).toBe(3)
    expect(withComposition({ offsetY: 9 }).composition.offsetY).toBe(0.5)
    expect(withComposition({ offsetY: 'bas' }).composition.offsetY).toBe(
      DEFAULT_COMPOSITION.offsetY,
    )
  })

  it('valide le placement d’un shot champ par champ', () => {
    const scene = parseScene({
      shots: [
        { input: 'a.png', placement: { scale: 99, dx: -7, dy: 0.25 } },
        { input: 'b.png', placement: 'au milieu' },
        { input: 'c.png' },
      ],
    })

    expect(scene.shots[0].placement).toEqual({ scale: 3, dx: -3, dy: 0.25 })
    expect(scene.shots[1].placement).toEqual(DEFAULT_PLACEMENT)
    expect(scene.shots[2].placement).toEqual(DEFAULT_PLACEMENT)
  })
})

describe('parseScene — calques', () => {
  const withLayers = (layers: unknown[]) => parseScene({ shots: [{ input: 'a.png', layers }] })

  it('écarte un `kind` inconnu sans faire tomber la scène', () => {
    const scene = withLayers([{ kind: 'licorne' }, { kind: 'box' }])
    expect(scene.shots[0]?.layers).toHaveLength(1)
    expect(scene.shots[0]?.layers[0]?.kind).toBe('box')
  })

  it('préserve le signe de `w` et `h` — une flèche pointe dans quatre quadrants', () => {
    const scene = withLayers([
      { kind: 'arrow', rect: { x: 0.6, y: 0.3, w: -0.2, h: -0.1 } },
    ])
    expect(scene.shots[0]?.layers[0]?.rect).toEqual({ x: 0.6, y: 0.3, w: -0.2, h: -0.1 })
  })

  it('ramène les réglages hors bornes dans ANNOTATION_LIMITS', () => {
    const scene = withLayers([
      { kind: 'box', strokeWidth: 99, opacity: -5, fill: 42, size: 0 },
    ])
    const layer = scene.shots[0]?.layers[0]
    expect(layer?.strokeWidth).toBe(ANNOTATION_LIMITS.strokeWidth.max)
    expect(layer?.opacity).toBe(ANNOTATION_LIMITS.opacity.min)
    expect(layer?.fill).toBe(ANNOTATION_LIMITS.fill.max)
    expect(layer?.size).toBe(ANNOTATION_LIMITS.size.min)
  })

  it('refuse une couleur qui n’est pas un hex à six chiffres', () => {
    const scene = withLayers([
      { kind: 'box', color: 'red' },
      { kind: 'box', color: '#ff0000' },
    ])
    expect(scene.shots[0]?.layers[0]?.color).toBe('#7DE2FF')
    expect(scene.shots[0]?.layers[1]?.color).toBe('#ff0000')
  })

  it('donne un id unique à chaque calque, même sans id fourni', () => {
    const scene = withLayers([{ kind: 'box' }, { kind: 'box' }])
    const [first, second] = scene.shots[0]?.layers ?? []
    expect(first?.id).toBeTruthy()
    expect(first?.id).not.toBe(second?.id)
  })

  it('n’invente pas de calque quand `layers` est absent', () => {
    expect(parseScene(minimal).shots[0]?.layers).toEqual([])
  })
})

describe('parseScene — filigrane et palette', () => {
  it('ignore un filigrane sans chemin', () => {
    expect(parseScene({ ...minimal, watermark: { opacity: 0.5 } }).watermark).toBeUndefined()
  })

  it('borne l’opacité et la taille du filigrane', () => {
    const scene = parseScene({ ...minimal, watermark: { path: 'logo.png', opacity: 9, size: 0 } })
    expect(scene.watermark?.opacity).toBe(1)
    expect(scene.watermark?.size).toBe(0.01)
  })

  it('ignore une palette dont la base n’est pas un hex', () => {
    expect(parseScene({ ...minimal, palette: { base: 'bleu' } }).palette).toBeUndefined()
    expect(parseScene({ ...minimal, palette: { base: '#101010' } }).palette?.base).toBe('#101010')
  })
})
