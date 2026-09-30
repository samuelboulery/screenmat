import { coreEn } from './core.en.ts'
import { coreFr } from './core.fr.ts'
import { inspectorEn } from './inspector.en.ts'
import { inspectorFr } from './inspector.fr.ts'
import { landingEn } from './landing.en.ts'
import { landingFr } from './landing.fr.ts'
import { messagesEn } from './messages.en.ts'
import { messagesFr } from './messages.fr.ts'
import { workspaceEn } from './workspace.en.ts'
import { workspaceFr } from './workspace.fr.ts'

/* La langue du chrome — jamais de l'artwork ni de la porte machine : le CLI et
   le serveur MCP n'appellent pas `setLang`, ils lisent donc l'anglais.

   Un dictionnaire par zone (`<zone>.en.ts`, `<zone>.fr.ts`) ; le français est
   typé sur l'anglais, une clé oubliée casse `tsc -b`. */

export type Lang = 'en' | 'fr'

export const LANG_KEY = 'sm-lang'

const en = { core: coreEn, inspector: inspectorEn, workspace: workspaceEn, messages: messagesEn, landing: landingEn }

export type Messages = typeof en

const DICTIONARIES: Record<Lang, Messages> = {
  en,
  fr: { core: coreFr, inspector: inspectorFr, workspace: workspaceFr, messages: messagesFr, landing: landingFr },
}

/** Le choix mémorisé s'il est valide, sinon la première langue du navigateur. */
export function resolveLang(stored: string | null, preferred: readonly string[]): Lang {
  if (stored === 'en' || stored === 'fr') return stored
  return preferred[0]?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

// ponytail: singleton de module, lu au rendu par liaison vivante — deux langues,
// une page. Un contexte React le jour où une troisième langue ou un rendu
// serveur arrive.
let lang: Lang = 'en'

/** Les textes de la langue courante. À lire au rendu, jamais à l'import : une
 *  constante de module figerait l'anglais. */
export let m: Messages = en

const listeners = new Set<() => void>()

export function getLang(): Lang {
  return lang
}

export function setLang(next: Lang): void {
  if (next === lang) return
  lang = next
  m = DICTIONARIES[next]
  if (typeof document !== 'undefined') document.documentElement.lang = next
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
