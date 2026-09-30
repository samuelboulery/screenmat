/* Thème du chrome — jamais de l'artwork : `renderScene` ne lit aucun de ces
   jetons, l'export est le même dans les deux thèmes. */

export type Theme = 'light' | 'dark'

export const THEME_KEY = 'sm-theme'

/** Le choix mémorisé s'il est valide, sinon le système. Même règle que le
 *  script d'`index.html`, qui pose le thème avant le premier rendu. */
export function resolveTheme(stored: string | null, systemDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return systemDark ? 'dark' : 'light'
}
