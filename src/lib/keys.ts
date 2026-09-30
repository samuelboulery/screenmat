/* Comment une touche s'écrit. La table des raccourcis (`SHORTCUTS`,
   `TOOL_KEYS`) est rédigée en symboles Mac ; ici on la découpe en capsules, et
   on la réécrit pour un clavier qui n'a ni ⌘ ni ⌥. Le clavier, lui, accepte déjà
   Ctrl partout (`useShortcuts`) : seul l'affichage dépend de la plateforme. */

import { m } from './i18n/index.ts'

/** Modificateurs, dans l'ordre où Windows et Linux les écrivent. */
const MODIFIERS = [
  ['⌘', 'Ctrl'],
  ['⌥', 'Alt'],
  ['⇧', 'Shift'],
] as const

const OTHER: Record<string, string> = { '⌫': 'Del' }

/** Symboles absents de la police mono embarquée : ils prennent la police
 *  système, à une taille où ils se lisent. */
const GLYPHS = new Set(['⌘', '⌥', '⇧', '⌫', '←', '↑', '→', '↓'])

/** Touches qui portent un nom plutôt qu'un caractère. */
const NAMED = new Set(['Esc', 'Space'])

/** Une touche nommée ou un geste, dans la langue de l'interface. La table,
 *  elle, reste écrite en anglais : ses chaînes sont des identités. */
const named = (token: string): string => m.core.keyNames[token] ?? token

export type Cap = { text: string; glyph: boolean }

/** Un accord — des touches pressées ensemble — ou un geste, écrit en clair. */
export type KeyPart = { kind: 'chord'; caps: Cap[] } | { kind: 'word'; text: string }

type PlatformSource = { platform?: string; userAgentData?: { platform?: string } }

/** Sans information, un Mac : la table est écrite pour lui. */
export function isMac(source: PlatformSource | undefined): boolean {
  // `||` : un navigateur qui masque `userAgentData.platform` la rend vide.
  const platform = source?.userAgentData?.platform || source?.platform
  return platform ? /Mac|iPhone|iPad/i.test(platform) : true
}

/** La plateforme de cette page, lue une fois. */
export const MAC = isMac(typeof navigator === 'undefined' ? undefined : (navigator as PlatformSource))

function chord(token: string, mac: boolean): Cap[] {
  const chars = [...token]
  if (mac) return chars.map((text) => ({ text, glyph: GLYPHS.has(text) }))

  const held = MODIFIERS.filter(([glyph]) => chars.includes(glyph)).map(([, name]) => ({ text: named(name), glyph: false }))
  const rest = chars
    .filter((char) => !MODIFIERS.some(([glyph]) => glyph === char))
    .map((char) => ({ text: char in OTHER ? named(OTHER[char]) : char, glyph: GLYPHS.has(char) && !(char in OTHER) }))
  return [...held, ...rest]
}

/**
 * Une chaîne de la table, en capsules : `⇧⌘Z` est un accord de trois touches,
 * `⌘↑ ⌘↓` deux accords, `⌥ drag` une touche et un geste. Un mot qui n'est pas
 * une touche — `drag`, `click` — reste du texte.
 */
export function keycaps(shortcut: string, mac: boolean): KeyPart[] {
  return shortcut
    .split(' ')
    .filter(Boolean)
    .map((token) => {
      if (NAMED.has(token)) return { kind: 'chord', caps: [{ text: named(token), glyph: false }] }
      if (token.length > 1 && /^[A-Za-z-]+$/.test(token)) return { kind: 'word', text: named(token) }
      return { kind: 'chord', caps: chord(token, mac) }
    })
}

/**
 * Une phrase qui cite des touches — un `title`, un libellé —, réécrite pour la
 * plateforme : `Export (⌘E)` devient `Export (Ctrl+E)`. Sur Mac, rien ne bouge.
 */
export function keyLabel(text: string, mac: boolean): string {
  if (mac) return text
  return text
    .replace(/[⌘⌥⇧]+(.?)/gu, (run, next: string) => {
      const names = MODIFIERS.filter(([glyph]) => run.includes(glyph)).map(([, name]) => named(name))
      // Suivi d'une touche, l'accord se lie par `+` ; seul (« ⇧ for ×5 »), il se nomme.
      const key = next && !/[\s\-)]/.test(next) ? `+${next in OTHER ? named(OTHER[next]) : next}` : next
      return names.join('+') + key
    })
    .replace(/⌫/g, named(OTHER['⌫']))
}
