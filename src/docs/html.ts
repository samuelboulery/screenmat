/**
 * La sortie de `md.ts` : son arbre `El`, sérialisé en HTML pour le prérendu du
 * build. C'est le seul consommateur de cet arbre — la documentation n'est plus
 * rendue dans le navigateur, elle arrive déjà écrite.
 *
 * `md.ts` ne produit pas de balises, et ce fichier est la seule chaîne de HTML
 * du projet. Il n'a le droit d'exister que parce qu'il échappe : ce qu'un
 * `createTextNode` donnait gratuitement se fait ici à la main. Un `<script>`
 * posé dans un `.md` doit ressortir en texte. Toucher à `escapeText` ou
 * `escapeAttr` sans lire `__tests__/html.test.ts`, c'est ouvrir une injection
 * dans des pages servies telles quelles.
 */
import type { El } from './md.ts'

/** Les éléments sans contenu ni balise fermante. `md.ts` ne produit que `hr`. */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])

export function toHtml(nodes: El[]): string {
  return nodes.map(toMarkup).join('')
}

function toMarkup(node: El): string {
  if (typeof node === 'string') return escapeText(node)

  const attrs = Object.entries(node.attrs ?? {})
    .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
    .join('')

  if (VOID.has(node.tag)) return `<${node.tag}${attrs}>`

  return `<${node.tag}${attrs}>${toHtml(node.children ?? [])}</${node.tag}>`
}

/**
 * `&` en premier, sinon on ré-échappe les esperluettes qu'on vient d'écrire.
 * ponytail: pas de `'` ni de `"` ici — un nœud de texte n'est jamais lu comme
 * une valeur d'attribut, et `escapeAttr` couvre l'autre contexte.
 */
function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Une valeur d'attribut est toujours entre guillemets doubles : `"` la
 * fermerait. Exporté parce que le prérendu écrit lui aussi des attributs et un
 * `<title>` : deux échappeurs identiques, c'est celui qu'on oublie de corriger.
 */
export function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;')
}
