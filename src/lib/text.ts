import type { WindowBox } from './render.ts'
import type { Annotation } from '../types.ts'

/* Mise en page d'un calque texte. Source unique : le dessin (`layers.ts`), le
   hit-test et le cadre de sélection (`annotate.ts`) lisent la même mesure —
   un cadre qui ne colle pas au texte, c'est un clic qui tombe à côté. */

/** Les polices embarquées d'abord : `public/fonts/` côté web, enregistrées par
 *  `cli/dom-shim.ts` côté Node. La pile système ne sert qu'en dernier recours. */
export const TEXT_FAMILIES = {
  sans: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const

/** Interligne, en fraction de la taille de police. */
const LINE_HEIGHT = 1.25

/** Avance moyenne d'un caractère, en fraction de la taille — la mesure de
 *  secours quand aucun canvas n'est disponible (tests Node sans shim). */
const FALLBACK_ADVANCE = { sans: 0.55, mono: 0.6 } as const

/** Largeur d'un texte en px, pour une police CSS donnée. */
export type Measure = (text: string, font: string, fontSize: number) => number

export type TextLine = { text: string; start: number; width: number }

export type TextLayout = {
  lines: TextLine[]
  font: string
  fontSize: number
  lineHeight: number
  padX: number
  padY: number
  /** Plaque comprise, en px du canvas. */
  width: number
  height: number
}

let context: CanvasRenderingContext2D | null | undefined

/** Mesure réelle par un canvas hors écran, créé une fois. */
export const measureText: Measure = (text, font, fontSize) => {
  if (context === undefined) {
    context =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }
  if (!context) {
    const mono = font.includes('Mono')
    return text.length * fontSize * FALLBACK_ADVANCE[mono ? 'mono' : 'sans']
  }
  context.font = font
  return context.measureText(text).width
}

/**
 * Charge les polices des calques texte avant un rendu. Une `@font-face` n'est
 * téléchargée qu'à sa première demande : un export lancé avant aurait dessiné
 * le texte dans la police de secours. Sans `document.fonts` (Node, où
 * `cli/dom-shim.ts` les enregistre d'avance), il n'y a rien à attendre.
 */
export function loadTextFonts(): Promise<unknown> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve()
  pending ??= Promise.all(
    Object.values(TEXT_FAMILIES).flatMap((family) =>
      [400, 700].map((weight) => document.fonts.load(`${weight} 16px ${family}`)),
    ),
  ).then(
    () => {
      textFontsReady = true
    },
    (cause: unknown) => {
      // Un échec se retente au prochain appel plutôt que de rester en cache.
      pending = null
      throw cause
    },
  )
  return pending
}

let pending: Promise<void> | null = null

/** Vrai une fois les polices chargées : un rendu peut alors rester synchrone,
 *  ce dont `runBatch` a besoin pour sérialiser ses rendus. */
export let textFontsReady = typeof document === 'undefined' || !('fonts' in document)

export function textFont(annotation: Annotation, fontSize: number): string {
  return `${annotation.weight} ${fontSize}px ${TEXT_FAMILIES[annotation.font]}`
}

/** Replie un paragraphe sur `max` px, mot à mot. Un mot plus long que la
 *  ligne reste entier : le couper au milieu trahirait ce qu'on a écrit. */
function wrap(paragraph: string, start: number, max: number, width: (text: string) => number): TextLine[] {
  const lines: TextLine[] = []
  let line = ''
  let lineStart = start
  let cursor = start

  for (const word of paragraph.split(' ')) {
    const candidate = line ? `${line} ${word}` : word
    if (line && width(candidate) > max) {
      lines.push({ text: line, start: lineStart, width: width(line) })
      line = word
      lineStart = cursor
    } else {
      line = candidate
    }
    cursor += word.length + 1
  }
  lines.push({ text: line, start: lineStart, width: width(line) })
  return lines
}

/**
 * Lignes, plaque et marges d'un texte, en px du canvas et avant la rotation de
 * la fenêtre. Tout découle de `size` et de la largeur de la fenêtre : la mise
 * en page est homothétique d'une échelle d'export à l'autre.
 */
export function layoutText(
  annotation: Annotation,
  box: WindowBox,
  measure: Measure = measureText,
): TextLayout {
  const fontSize = annotation.size * box.width
  const font = textFont(annotation, fontSize)
  const plate = annotation.background.on
  const padX = plate ? annotation.background.padding * fontSize : 0
  const padY = plate ? annotation.background.padding * fontSize * 0.6 : 0
  const width = (text: string) => measure(text, font, fontSize)

  const fixed = annotation.rect.w > 0 ? annotation.rect.w * box.width : 0
  const max = fixed > 0 ? Math.max(fontSize, fixed - padX * 2) : Infinity

  const lines: TextLine[] = []
  let start = 0
  for (const paragraph of annotation.text.split('\n')) {
    lines.push(...wrap(paragraph, start, max, width))
    start += paragraph.length + 1
  }

  const lineHeight = fontSize * LINE_HEIGHT
  const inner = Math.max(...lines.map((line) => line.width))
  return {
    lines,
    font,
    fontSize,
    lineHeight,
    padX,
    padY,
    width: fixed > 0 ? fixed : inner + padX * 2,
    height: lines.length * lineHeight + padY * 2,
  }
}

/**
 * Ombre portée d'un calque, en px du canvas. `shadowBlur` et `shadowOffset*`
 * ignorent la transformation du contexte : ils se calculent donc sur la
 * largeur de la fenêtre, déjà mise à l'échelle d'export par `computeGeometry`.
 * L'ombre de l'export 3× est ainsi celle de la preview, trois fois plus grande.
 */
export function shadowFor(
  shadow: number,
  box: WindowBox,
): { blur: number; offsetY: number; color: string } | null {
  if (shadow <= 0) return null
  return {
    blur: box.width * 0.02 * shadow,
    offsetY: box.width * 0.006 * shadow,
    color: `rgba(0, 0, 0, ${(0.25 + 0.35 * shadow).toFixed(3)})`,
  }
}
