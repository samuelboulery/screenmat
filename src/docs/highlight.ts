/**
 * Coloration syntaxique minimale des blocs de code de `/docs`. Comme `md.ts`,
 * elle produit des éléments (`El`) et non du HTML : le test tourne sans DOM.
 *
 * ponytail: trois langages, à la regex, sans état — `json` (commentaires
 * compris), `bash` et `ts`. Un `#` à l'intérieur d'une chaîne shell et un
 * mot-clé au milieu d'un identifiant sont les deux erreurs connues : elles
 * teintent un token de travers, elles n'en cassent aucun. Le jour où il faut
 * mieux, c'est un vrai coloriseur qu'il faut, pas une alternative de plus.
 */
import type { El } from './md.ts'

/** Un motif par langage : l'ordre des alternatives est l'ordre de priorité, et
 *  `classes[n]` nomme le groupe `n + 1`. Une classe vide laisse le texte brut. */
const GRAMMARS: Record<string, { pattern: RegExp; classes: string[] }> = {
  json: {
    // Une clé est une chaîne suivie d'un « : » : l'alternative la capture avec.
    pattern:
      /("(?:[^"\\]|\\.)*")(\s*:)|("(?:[^"\\]|\\.)*")|(\/\/[^\n]*)|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g,
    classes: ['key', '', 'str', 'com', 'lit', 'num'],
  },
  bash: {
    pattern: /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'[^']*')|(^|\s)(--?[\w-]+)/g,
    classes: ['com', 'str', '', 'flag'],
  },
  ts: {
    pattern:
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('[^']*'|"[^"]*"|`[^`]*`)|\b(import|from|export|const|let|await|async|function|return|new|type|interface|if|else|for|of|throw|try|catch)\b|\b(\d+(?:\.\d+)?)\b/g,
    classes: ['com', 'str', 'kw', 'num'],
  },
}

const ALIASES: Record<string, string> = {
  jsonc: 'json',
  sh: 'bash',
  shell: 'bash',
  console: 'bash',
  js: 'ts',
  javascript: 'ts',
  typescript: 'ts',
}

/**
 * Découpe le code en texte et en `<span>` classés. Un langage inconnu — `text`,
 * celui des schémas ASCII — ressort en un seul morceau de texte.
 */
export function highlight(source: string, lang: string): El[] {
  const grammar = GRAMMARS[ALIASES[lang] ?? lang]
  if (!grammar) return [source]

  const nodes: El[] = []
  let last = 0

  for (const match of source.matchAll(grammar.pattern)) {
    const at = match.index
    if (at > last) nodes.push(source.slice(last, at))
    nodes.push(...tokens(match, grammar.classes))
    last = at + match[0].length
  }

  if (last < source.length) nodes.push(source.slice(last))
  return nodes
}

function tokens(match: RegExpMatchArray, classes: string[]): El[] {
  const out: El[] = []

  for (const [index, cls] of classes.entries()) {
    const value = match[index + 1]
    if (value === undefined) continue
    out.push(cls ? { tag: 'span', attrs: { class: `tok-${cls}` }, children: [value] } : value)
  }

  return out
}
