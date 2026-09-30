import { TOOL_STYLE_KEYS, type ToolStyle } from './annotate.ts'
import { isRecord } from './parse.ts'
import { ANNOTATION_KINDS, parseAnnotation } from './spec.ts'
import type { Annotation, AnnotationKind } from '../types.ts'

/* Le dernier style de chaque outil : une pastille passée au rouge le reste à la
   suivante, et au prochain lancement. Préférence d'interface, donc
   `localStorage` — jamais dans une scène ni dans un style exporté. */

const KEY = 'screenmat:tool-styles'

type ToolStyles = Partial<Record<AnnotationKind, ToolStyle>>

/** Lu une fois, déjà validé : l'aperçu d'un tracé le consulte à chaque frame. */
let cache: ToolStyles | null = null

type ToolKey = (typeof TOOL_STYLE_KEYS)[number]

function copy<K extends ToolKey>(style: ToolStyle, key: K, from: Annotation): void {
  style[key] = from[key]
}

/** Ce qu'un patch ou une valeur relue dit du style, validé. Ce qui sort du
 *  stockage est une donnée externe : chaque champ repasse par le parseur de
 *  calque, qui borne et retombe sur le défaut du type. */
export function parseToolStyle(kind: AnnotationKind, value: unknown): ToolStyle {
  if (!isRecord(value)) return {}
  // `font` posé d'office : sans lui, le parseur prendrait un texte inversé pour
  // un label de l'ancien format.
  const parsed = parseAnnotation({ font: 'sans', ...value, kind })
  const style: ToolStyle = {}
  for (const key of TOOL_STYLE_KEYS) {
    if (value[key] !== undefined) copy(style, key, parsed)
  }
  return style
}

/** Le stockage, validé type par type — rien d'autre n'en sort, donc rien
 *  d'autre n'y retourne. `null` s'il est illisible. */
function read(): ToolStyles | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (!isRecord(stored)) return {}
    return Object.fromEntries(
      ANNOTATION_KINDS.filter((kind) => isRecord(stored[kind])).map((kind) => [kind, parseToolStyle(kind, stored[kind])]),
    )
  } catch {
    // Mode privé, stockage absent ou JSON abîmé.
    return null
  }
}

function load(): ToolStyles {
  cache ??= read() ?? {}
  return cache
}

export function toolStyle(kind: AnnotationKind): ToolStyle {
  return load()[kind] ?? {}
}

/** À appeler sur tout patch de calque : ce qui n'est pas du style est ignoré. */
export function rememberToolStyle(kind: AnnotationKind, patch: Partial<Annotation>): void {
  const style = parseToolStyle(kind, patch)
  if (Object.keys(style).length === 0) return

  // Relu avant d'écrire : un autre onglet a pu enregistrer le style d'un autre
  // outil, que la copie en mémoire écraserait.
  const current = read() ?? load()
  cache = { ...current, [kind]: { ...current[kind], ...style } }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // Mode privé ou stockage plein : le style tient jusqu'à la fin de la session.
  }
}

/** Vide la copie en mémoire, pour relire le stockage. Sert aux tests. */
export function forgetToolStyles(): void {
  cache = null
}
