/**
 * Format de scène sérialisable — la porte d'entrée des appelants qui ne sont
 * pas l'interface : un CLI, un serveur MCP, un script de build.
 *
 * Un style (`styles.ts`) ne décrit que des réglages. Une scène décrit un
 * document complet : quelles images, avec quels réglages, quelle composition,
 * et quels calques sur chacune. C'est ce qui permet d'atteindre tout le produit
 * — annotations et floutage compris — et pas seulement les presets.
 *
 * `parseScene` suit exactement l'idiome de `parseStyle` : un JSON produit par
 * une machine est une donnée externe au même titre qu'un fichier importé à la
 * main. Chaque champ est vérifié, borné, et retombe sur sa valeur par défaut.
 */
import {
  ANNOTATION_DEFAULTS,
  ANNOTATION_LIMITS,
  DEFAULT_LABEL_SIZE,
  nextId,
} from './annotate.ts'
import { HEX, bool, clamp, isRecord, num, oneOf } from './parse.ts'
import { parsePalette, parseSettings } from './styles.ts'
import { WATERMARK_POSITIONS } from './watermark.ts'
import {
  DEFAULT_COMPOSITION,
  type Annotation,
  type AnnotationKind,
  type Composition,
  type FractionRect,
  type Palette,
  type Settings,
  type WatermarkPosition,
} from '../types.ts'

const ANNOTATION_KINDS = [
  'text',
  'badge',
  'arrow',
  'line',
  'box',
  'ellipse',
  'redaction',
] as const satisfies readonly AnnotationKind[]

/** La source d'une image : un chemin dans un document JSON, ou des octets
 *  déjà en mémoire quand l'appelant est un script qui vient de la produire.
 *  `Uint8Array` et non `Buffer` : `src/lib/` ignore qu'il existe un Node. */
export type ImageSource = string | Uint8Array

export const isImageSource = (value: unknown): value is ImageSource =>
  (typeof value === 'string' && value.trim().length > 0) || value instanceof Uint8Array

/** Un shot après validation : la source est laissée telle quelle, c'est
 *  l'appelant qui sait la résoudre. */
export type ShotSpec = {
  input: ImageSource
  name: string
  layers: Annotation[]
}

/** Le filigrane d'une scène désigne un fichier, là où un style embarque une
 *  dataURL : une machine passe des chemins, pas du base64. */
export type WatermarkSpec = {
  path: ImageSource
  position: WatermarkPosition
  opacity: number
  size: number
}

export type SceneSpec = {
  /** Nom d'un style de `~/.shotframe/styles/`, appliqué sous les `settings`. */
  style?: string
  settings: Settings
  composition: Composition
  shots: ShotSpec[]
  /** Palette figée. Absente ⇒ extraite du premier screenshot. */
  palette?: Palette
  watermark?: WatermarkSpec
  /** Image de fond, requise si `settings.background === 'image'`. */
  background?: ImageSource
  scale: number
}

/** Le seul endroit qui connaît les échelles d'export. */
export const SCALES = [1, 2, 3] as const

export function parseScene(raw: string | unknown): SceneSpec {
  let parsed: unknown = raw

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('Scène illisible : ce n’est pas du JSON')
    }
  }

  if (!isRecord(parsed)) {
    throw new Error('Une scène est un objet JSON')
  }

  const shots = parseShots(parsed.shots)
  if (shots.length === 0) {
    throw new Error('Une scène a besoin d’au moins un shot avec un champ `input`')
  }

  return {
    style: typeof parsed.style === 'string' && parsed.style.trim() ? parsed.style.trim() : undefined,
    settings: parseSettings(parsed.settings),
    composition: parseComposition(parsed.composition),
    shots,
    palette: parsePalette(parsed.palette),
    watermark: parseWatermarkSpec(parsed.watermark),
    background: isImageSource(parsed.background) ? parsed.background : undefined,
    scale: SCALES.includes(Math.round(num(parsed.scale, 2)) as (typeof SCALES)[number])
      ? Math.round(num(parsed.scale, 2))
      : 2,
  }
}

function parseShots(value: unknown): ShotSpec[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .filter((shot) => isImageSource(shot.input))
    .slice(0, 24)
    .map((shot, index) => ({
      input: typeof shot.input === 'string' ? shot.input.trim() : (shot.input as Uint8Array),
      name: typeof shot.name === 'string' && shot.name.trim()
        ? shot.name.trim().slice(0, 64)
        : `shot-${index + 1}`,
      layers: parseLayers(shot.layers),
    }))
}

/** Les calques d'un shot. Un `kind` inconnu est écarté sans faire tomber la
 *  scène : mieux vaut un visuel auquel il manque une flèche qu'un échec sec
 *  parce qu'un modèle a inventé un type de calque. */
function parseLayers(value: unknown): Annotation[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .filter((layer) => (ANNOTATION_KINDS as readonly string[]).includes(String(layer.kind)))
    .slice(0, 64)
    .map(parseAnnotation)
}

function parseAnnotation(value: Record<string, unknown>): Annotation {
  const kind = oneOf(value.kind, ANNOTATION_KINDS, 'box')
  const limits = ANNOTATION_LIMITS
  const d = ANNOTATION_DEFAULTS

  return {
    id: nextId(kind),
    kind,
    rect: parseRect(value.rect),
    name: typeof value.name === 'string' ? value.name.slice(0, 64) : d.name,
    hidden: bool(value.hidden, d.hidden),
    locked: bool(value.locked, d.locked),
    text: typeof value.text === 'string' ? value.text.slice(0, 280) : '',
    labelStyle: oneOf(value.labelStyle, ['pill', 'plain', 'badge'] as const, 'pill'),
    invert: bool(value.invert, d.invert),
    size: clamp(num(value.size, DEFAULT_LABEL_SIZE), limits.size.min, limits.size.max),
    redaction: oneOf(value.redaction, ['blur', 'pixel', 'solid'] as const, 'blur'),
    color: typeof value.color === 'string' && HEX.test(value.color) ? value.color : d.color,
    strokeWidth: clamp(
      num(value.strokeWidth, d.strokeWidth),
      limits.strokeWidth.min,
      limits.strokeWidth.max,
    ),
    radius: clamp(num(value.radius, d.radius), limits.radius.min, limits.radius.max),
    arrowHead: clamp(num(value.arrowHead, d.arrowHead), limits.arrowHead.min, limits.arrowHead.max),
    fill: clamp(num(value.fill, d.fill), limits.fill.min, limits.fill.max),
    opacity: clamp(num(value.opacity, d.opacity), limits.opacity.min, limits.opacity.max),
  }
}

/**
 * Un rect de calque, en fractions de la largeur de sa FENÊTRE — `y` compris,
 * divisé par la largeur et non par la hauteur.
 *
 * `w` et `h` gardent leur signe : c'est ce qui fait pointer une flèche dans les
 * quatre quadrants. Les borner symétriquement, jamais les normaliser.
 */
function parseRect(value: unknown): FractionRect {
  if (!isRecord(value)) return { x: 0, y: 0, w: 0, h: 0 }

  return {
    x: clamp(num(value.x, 0), -2, 3),
    y: clamp(num(value.y, 0), -2, 3),
    w: clamp(num(value.w, 0), -3, 3),
    h: clamp(num(value.h, 0), -3, 3),
  }
}

function parseComposition(value: unknown): Composition {
  if (!isRecord(value)) return DEFAULT_COMPOSITION
  const d = DEFAULT_COMPOSITION

  return {
    layout: oneOf(value.layout, ['single', 'stack', 'side', 'tilt3d'] as const, d.layout),
    spread: clamp(num(value.spread, d.spread), 0, 1),
    converge: clamp(num(value.converge, d.converge), 0, 24),
    elevation: clamp(num(value.elevation, d.elevation), 0, 0.1),
  }
}

function parseWatermarkSpec(value: unknown): WatermarkSpec | undefined {
  if (!isRecord(value) || !isImageSource(value.path)) return undefined

  return {
    path: typeof value.path === 'string' ? value.path.trim() : value.path,
    position: oneOf(value.position, WATERMARK_POSITIONS, 'bottom-right'),
    opacity: clamp(num(value.opacity, 0.6), 0, 1),
    size: clamp(num(value.size, 0.09), 0.01, 0.5),
  }
}
