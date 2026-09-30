import { createAnnotation } from '../lib/annotate.ts'
import { DEFAULT_COMPOSITION, DEFAULT_SETTINGS, type Annotation, type Palette, type Scene } from '../types.ts'

/** Les quatre touches de la vitrine — celles de l'éditeur. */
export type HeroKey = 't' | 'a' | 'r' | 'b'

export const HERO_KEYS: Record<HeroKey, string> = { t: 'Text', a: 'Arrow', r: 'Box', b: 'Blur' }

/* Trois places par touche, en fractions de la capture (largeur, hauteur) : la
   démo et une capture collée partagent les mêmes, qui tombent sur un tableau de
   bord ordinaire sans rien masquer d'important. */
const SPOTS: Record<HeroKey, readonly { x: number; y: number; w: number; h: number }[]> = {
  r: [
    { x: 0.215, y: 0.155, w: 0.24, h: 0.18 },
    { x: 0.215, y: 0.36, w: 0.76, h: 0.36 },
    { x: 0.02, y: 0.1, w: 0.15, h: 0.42 },
  ],
  t: [
    { x: 0.3, y: 0.04, w: 0, h: 0 },
    { x: 0.04, y: 0.9, w: 0, h: 0 },
    { x: 0.56, y: 0.5, w: 0, h: 0 },
  ],
  a: [
    { x: 0.14, y: 0.06, w: 0.085, h: 0.12 },
    { x: 0.42, y: 0.95, w: 0.08, h: -0.15 },
    { x: 0.92, y: 0.92, w: -0.09, h: -0.16 },
  ],
  b: [
    { x: 0.47, y: 0.735, w: 0.3, h: 0.25 },
    { x: 0.215, y: 0.155, w: 0.76, h: 0.18 },
    { x: 0.02, y: 0.1, w: 0.15, h: 0.42 },
  ],
}

const TEXTS = {
  demo: ['Revenue up 18% this quarter', 'Weekly export is live', 'Best month yet'],
  user: ['Look here', 'New', 'Ship it'],
} as const

/**
 * Le calque d'une touche, à sa `n`-ième place. Les calques se placent en
 * fractions de la LARGEUR de leur fenêtre, `y` compris : d'où `aspect`
 * (hauteur / largeur de la capture) pour convertir une fraction de hauteur.
 */
export function heroLayer(key: HeroKey, n: number, aspect: number, demo: boolean): Annotation {
  const spot = SPOTS[key][n % 3]!
  const rect = { x: spot.x, y: spot.y * aspect, w: spot.w, h: spot.h * aspect }
  const kind = { t: 'text', a: 'arrow', r: 'box', b: 'redaction' } as const
  const layer = createAnnotation(kind[key], rect)
  return key === 't' ? { ...layer, text: TEXTS[demo ? 'demo' : 'user'][n % 3]! } : layer
}

/** La scène de la vitrine : les réglages par défaut de l'éditeur, rien d'autre. */
export function heroScene(image: HTMLImageElement, palette: Palette, layers: readonly Annotation[]): Scene {
  return {
    shots: [{ id: 'hero', name: 'hero', image, palette, layers: [...layers] }],
    palette,
    settings: DEFAULT_SETTINGS,
    composition: DEFAULT_COMPOSITION,
  }
}
