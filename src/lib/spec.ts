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
import { ANNOTATION_ACCENT, ANNOTATION_LIMITS, defaultsFor, nextId, TEXT_BACKGROUND } from './annotate.ts'
import { inkOn } from './color.ts'
import { HEX, bool, clamp, isRecord, num, oneOf } from './parse.ts'
import { parsePalette, parseSettings } from './styles.ts'
import { WATERMARK_POSITIONS } from './watermark.ts'
import {
  DEFAULT_COMPOSITION,
  DEFAULT_PAN,
  DEFAULT_PLACEMENT,
  type Annotation,
  type AnnotationKind,
  type Composition,
  type FractionRect,
  type TextBackground,
  type Palette,
  type Pan,
  type Placement,
  type Settings,
  type WatermarkPosition,
} from '../types.ts'

export const ANNOTATION_KINDS = [
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
  placement: Placement
  pan: Pan
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
  /** Nom d'un style de `~/.screenmat/styles/`, appliqué sous les `settings`. */
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
      throw new Error('Unreadable scene: not JSON')
    }
  }

  if (!isRecord(parsed)) {
    throw new Error('A scene is a JSON object')
  }

  const shots = parseShots(parsed.shots)
  if (shots.length === 0) {
    throw new Error('A scene needs at least one shot with an `input` field')
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
      placement: parsePlacement(shot.placement),
      pan: parsePan(shot.pan),
    }))
}

/** Position du screenshot dans son écran. Bornée à 0..1 : au-delà, l'écran
 *  montrerait du vide. Exportée pour `inspect()`, qui la reçoit hors scène. */
export function parsePan(value: unknown): Pan {
  if (!isRecord(value)) return DEFAULT_PAN
  return {
    x: clamp(num(value.x, DEFAULT_PAN.x), 0, 1),
    y: clamp(num(value.y, DEFAULT_PAN.y), 0, 1),
  }
}

/** Le `x,y` d'un drapeau de ligne de commande. Deux nombres, ou l'erreur le
 *  dit : `Number('')` vaut 0, et un `--pan 0.5,` cadrerait le bord haut sans un mot. */
export function panFromText(text: string): Pan {
  const parts = text.split(',').map((part) => (part.trim() === '' ? Number.NaN : Number(part)))
  if (parts.length !== 2 || !parts.every(Number.isFinite)) {
    throw new Error(`\`--pan\` attend deux nombres entre 0 et 1, « x,y » — reçu « ${text} »`)
  }
  return parsePan({ x: parts[0], y: parts[1] })
}

/** Retouche manuelle d'une fenêtre. Bornes larges mais finies : un `scale` nul
 *  ou un décalage aberrant sortirait la fenêtre du canvas sans le dire. */
function parsePlacement(value: unknown): Placement {
  if (!isRecord(value)) return DEFAULT_PLACEMENT
  const d = DEFAULT_PLACEMENT

  return {
    scale: clamp(num(value.scale, d.scale), 0.2, 3),
    dx: clamp(num(value.dx, d.dx), -3, 3),
    dy: clamp(num(value.dy, d.dy), -3, 3),
  }
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

export function parseAnnotation(value: Record<string, unknown>): Annotation {
  const kind = oneOf(value.kind, ANNOTATION_KINDS, 'box')
  const limits = ANNOTATION_LIMITS
  const d = defaultsFor(kind)
  // Un label d'avant le calque texte : il porte `labelStyle` ou `invert`, pas de `font`.
  const legacy = kind === 'text' && value.font === undefined && (value.labelStyle !== undefined || value.invert !== undefined)
  const legacyInvert = legacy && bool(value.invert, false) && value.labelStyle !== 'plain'
  const color = typeof value.color === 'string' && HEX.test(value.color) ? value.color : legacy ? ANNOTATION_ACCENT : d.color

  return {
    id: nextId(kind),
    kind,
    rect: parseRect(value.rect),
    name: typeof value.name === 'string' ? value.name.slice(0, 64) : d.name,
    hidden: bool(value.hidden, d.hidden),
    locked: bool(value.locked, d.locked),
    text: typeof value.text === 'string' ? value.text.slice(0, 280) : '',
    ...parseText(value, legacy),
    invert: bool(value.invert, d.invert),
    size: clamp(num(value.size, legacy ? LEGACY_LABEL_SIZE : d.size), limits.size.min, limits.size.max),
    redaction: oneOf(value.redaction, ['blur', 'pixel', 'solid'] as const, 'blur'),
    redactionShape: oneOf(value.redactionShape, ['rect', 'ellipse'] as const, 'rect'),
    color: legacyInvert ? inkOn(color, '#000000') : color,
    strokeWidth: clamp(
      num(value.strokeWidth, d.strokeWidth),
      limits.strokeWidth.min,
      limits.strokeWidth.max,
    ),
    radius: clamp(num(value.radius, d.radius), limits.radius.min, limits.radius.max),
    arrowHead: clamp(num(value.arrowHead, d.arrowHead), limits.arrowHead.min, limits.arrowHead.max),
    fill: clamp(num(value.fill, d.fill), limits.fill.min, limits.fill.max),
    // Sans couleur de fond, celle du trait : une scène d'avant la dissociation
    // rend comme avant.
    fillColor: typeof value.fillColor === 'string' && HEX.test(value.fillColor) ? value.fillColor : color,
    stroke: bool(value.stroke, d.stroke),
    strokeOpacity: clamp(num(value.strokeOpacity, d.strokeOpacity), limits.strokeOpacity.min, limits.strokeOpacity.max),
    opacity: clamp(num(value.opacity, d.opacity), limits.opacity.min, limits.opacity.max),
    shadow: clamp(num(value.shadow, legacy ? 0 : d.shadow), limits.shadow.min, limits.shadow.max),
  }
}

/** Taille de l'ancien label mono, qui n'avait pas de défaut propre au texte. */
const LEGACY_LABEL_SIZE = 0.011

/** Les réglages propres à un texte. Un ancien label (`labelStyle`, sans
 *  `font`) se relit à l'identique ou presque : mono, plaque d'après son style,
 *  couleurs échangées s'il était inversé. */
function parseText(
  value: Record<string, unknown>,
  legacy: boolean,
): Pick<Annotation, 'font' | 'weight' | 'align' | 'background'> {
  const limits = ANNOTATION_LIMITS
  return {
    font: oneOf(value.font, ['sans', 'mono'] as const, legacy ? 'mono' : 'sans'),
    weight: Math.round(clamp(num(value.weight, legacy ? 400 : 600), limits.weight.min, limits.weight.max) / 100) * 100,
    align: oneOf(value.align, ['left', 'center', 'right'] as const, 'left'),
    background: legacy ? legacyBackground(value) : parseBackground(value.background),
  }
}

function parseBackground(value: unknown): TextBackground {
  const d = TEXT_BACKGROUND
  if (!isRecord(value)) return d
  const limits = ANNOTATION_LIMITS
  return {
    on: bool(value.on, d.on),
    color: typeof value.color === 'string' && HEX.test(value.color) ? value.color : d.color,
    opacity: clamp(num(value.opacity, d.opacity), 0, 1),
    padding: clamp(num(value.padding, d.padding), limits.padding.min, limits.padding.max),
    radius: clamp(num(value.radius, d.radius), limits.plateRadius.min, limits.plateRadius.max),
  }
}

/** `pill` et `badge` avaient une plaque sombre translucide, `plain` aucune ;
 *  inversée, la plaque prenait la couleur du calque. */
function legacyBackground(value: Record<string, unknown>): TextBackground {
  const style = oneOf(value.labelStyle, ['pill', 'plain', 'badge'] as const, 'pill')
  const color = typeof value.color === 'string' && HEX.test(value.color) ? value.color : ANNOTATION_ACCENT
  if (style === 'plain') return { ...TEXT_BACKGROUND, on: false }
  const radius = style === 'pill' ? 1 : 0.35
  if (bool(value.invert, false)) return { ...TEXT_BACKGROUND, color, opacity: 1, radius }
  return { ...TEXT_BACKGROUND, color: '#07070A', opacity: 0.78, radius }
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
    columns: Math.round(clamp(num(value.columns, d.columns), 0, 8)),
    offsetY: clamp(num(value.offsetY, d.offsetY), -0.5, 0.5),
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
