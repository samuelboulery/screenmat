/** Les clés restent les abréviations mono d'origine — c'est l'identité d'un
 *  outil dans le code, pas ce qui s'affiche. Le rail fait 56 px : à l'écran,
 *  l'icône va seule, et le nom complet vit dans l'infobulle.
 *
 *  Le rail ne porte que des **instruments** : ce qui laisse une trace sur le
 *  screenshot. Les réglages du document — cadre, fond, profondeur — vivent dans
 *  l'inspecteur, où ils n'usurpent plus la place d'un outil. */
export type Tool = 'SEL' | 'TXT' | 'NUM' | 'ARR' | 'LIN' | 'BOX' | 'ELL' | 'RDC'

export const TOOLS: Tool[] = ['SEL', 'TXT', 'NUM', 'ARR', 'LIN', 'BOX', 'ELL', 'RDC']

/** Touche nue de chaque outil — celles de Figma là où elles existent. `R`
 *  prend la Box, le fond se régénère donc à `⇧R`. */
export const TOOL_KEYS: Record<Tool, string> = {
  SEL: 'V',
  TXT: 'T',
  NUM: 'N',
  ARR: 'A',
  LIN: 'L',
  BOX: 'R',
  ELL: 'O',
  RDC: 'B',
}

/** L'outil d'une touche nue, en minuscule ou non. */
export function toolForKey(key: string): Tool | null {
  const upper = key.toUpperCase()
  return TOOLS.find((tool) => TOOL_KEYS[tool] === upper) ?? null
}

export const TOOL_TITLES: Record<Tool, string> = {
  SEL: 'Select',
  TXT: 'Text label',
  ARR: 'Arrow',
  LIN: 'Line',
  BOX: 'Box',
  ELL: 'Ellipse',
  NUM: 'Numbered badge',
  RDC: 'Redact',
}
