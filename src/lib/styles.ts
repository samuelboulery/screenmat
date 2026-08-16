import { nextId } from './annotate.ts'
import { triggerDownload } from './export.ts'
import { HEX, clamp, isRecord, num, oneOf } from './parse.ts'
import { WATERMARK_POSITIONS } from './watermark.ts'
import {
  DEFAULT_SETTINGS,
  type Palette,
  type Settings,
  type Style,
  type Watermark,
} from '../types.ts'

/** Clé de préférence : le dernier style appliqué, retrouvé au démarrage. */
const LAST_STYLE_KEY = 'shotframe:last-style'

export function createStyle(name: string, settings: Settings, palette?: Palette): Style {
  return { id: nextId('style'), name, settings, palette }
}

export function styleFilename(style: Style): string {
  const slug = style.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${slug || 'style'}.shotframe.json`
}

/** Le seul mécanisme de partage : un fichier, pas un compte. */
export function exportStyle(style: Style): void {
  const json = JSON.stringify({ kind: 'shotframe-style', version: 1, style }, null, 2)
  triggerDownload(new Blob([json], { type: 'application/json' }), styleFilename(style))
}

/* --- Import ------------------------------------------------------------- */

/**
 * Valide un fichier importé. Un `.json` venant d'ailleurs est une donnée
 * externe : chaque champ est vérifié et retombe sur la valeur par défaut plutôt
 * que d'être copié tel quel dans l'état.
 */
export function parseStyle(raw: string): Style {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Fichier illisible : ce n’est pas du JSON')
  }

  if (!isRecord(parsed) || parsed.kind !== 'shotframe-style' || !isRecord(parsed.style)) {
    throw new Error('Ce fichier n’est pas un style shotframe')
  }

  const style = parsed.style
  const name = typeof style.name === 'string' && style.name.trim() ? style.name.trim() : 'Imported'

  return {
    id: nextId('style'),
    name: name.slice(0, 64),
    settings: parseSettings(style.settings),
    palette: parsePalette(style.palette),
    watermark: parseWatermark(style.watermark),
  }
}

/** Exporté pour `spec.ts` : une scène produite par une machine porte les mêmes
 *  réglages qu'un style importé, et doit passer par les mêmes bornes. */
export function parseSettings(value: unknown): Settings {
  if (!isRecord(value)) return DEFAULT_SETTINGS
  const d = DEFAULT_SETTINGS

  return {
    padding: clamp(num(value.padding, d.padding), 0, 0.3),
    ratio: oneOf(value.ratio, ['4:3', '1:1', '16:9', '9:16', 'auto'] as const, d.ratio),
    radius: clamp(num(value.radius, d.radius), 0, 0.08),
    titleBar: typeof value.titleBar === 'boolean' ? value.titleBar : d.titleBar,
    theme: oneOf(value.theme, ['auto', 'light', 'dark'] as const, d.theme),
    url: typeof value.url === 'string' ? value.url.slice(0, 200) : d.url,
    blur: clamp(num(value.blur, d.blur), 1, 32),
    shapes: clamp(Math.round(num(value.shapes, d.shapes)), 0, 12),
    shapeOpacity: clamp(num(value.shapeOpacity, d.shapeOpacity), 0, 1),
    saturation: clamp(num(value.saturation, d.saturation), 0, 2),
    contrast: clamp(num(value.contrast, d.contrast), 0, 2),
    grain: clamp(num(value.grain, d.grain), 0, 1),
    seed: Math.round(num(value.seed, d.seed)),
    format: oneOf(value.format, ['png', 'webp'] as const, d.format),
    frame: oneOf(value.frame, ['browser', 'macbook', 'iphone', 'none'] as const, d.frame),
    background: oneOf(value.background, ['mesh', 'gradient', 'solid', 'image'] as const, d.background),
    rotateY: clamp(num(value.rotateY, d.rotateY), -24, 24),
    shadow: clamp(num(value.shadow, d.shadow), 0, 2),
  }
}

export function parsePalette(value: unknown): Palette | undefined {
  if (!isRecord(value) || typeof value.base !== 'string' || !HEX.test(value.base)) return undefined
  const accents = Array.isArray(value.accents)
    ? value.accents.filter((color): color is string => typeof color === 'string' && HEX.test(color))
    : []
  return { base: value.base, accents: accents.slice(0, 8) }
}

function parseWatermark(value: unknown): Watermark | undefined {
  if (!isRecord(value) || typeof value.dataUrl !== 'string') return undefined
  // Un dataURL d'image, et rien d'autre : pas de `javascript:` ni d'URL distante.
  if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(value.dataUrl)) return undefined

  return {
    dataUrl: value.dataUrl,
    position: oneOf(value.position, WATERMARK_POSITIONS, 'bottom-right'),
    opacity: clamp(num(value.opacity, 0.6), 0, 1),
    size: clamp(num(value.size, 0.09), 0.01, 0.5),
  }
}

/* --- Préférences (localStorage) ----------------------------------------- */

export function rememberStyle(id: string | null): void {
  try {
    if (id) localStorage.setItem(LAST_STYLE_KEY, id)
    else localStorage.removeItem(LAST_STYLE_KEY)
  } catch {
    // Mode privé ou stockage plein : le style courant reste en mémoire, c'est tout.
  }
}

export function lastStyleId(): string | null {
  try {
    return localStorage.getItem(LAST_STYLE_KEY)
  } catch {
    return null
  }
}
