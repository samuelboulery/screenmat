/**
 * Mini-rendu Markdown de la page `/docs`. Le sous-ensemble est volontairement
 * étroit : ce que la documentation utilise réellement, et rien de plus — titres,
 * paragraphes, listes, tableaux, blocs de code, encarts, filets, liens.
 *
 * Il ne produit pas de HTML mais un arbre d'éléments (`El`), que `html.ts`
 * sérialise au build. Le parsing se teste ainsi dans l'environnement `node` de
 * Vitest sans dépendance DOM, et l'échappement reste à un seul endroit : un
 * `<script>` posé dans un `.md` ressort en texte parce que `html.ts` l'échappe,
 * et c'est `__tests__/html.test.ts` qui le prouve. Ne pas produire de balises
 * ici, jamais — ce serait une seconde porte, non gardée.
 *
 * ponytail: pas de HTML brut, pas de notes de bas de page, pas de listes de
 * définition. Les schémas sont en ASCII dans un bloc ```text — ce qui se lit
 * aussi bien ici que dans le `.md` brut donné à un LLM. Le jour où il faut
 * davantage, c'est une vraie dépendance qu'il faut prendre, pas une regex de plus.
 */
import { highlight } from './highlight.ts'

/** Un élément, ou du texte. C'est tout le vocabulaire de sortie. */
export type El = string | { tag: string; attrs?: Record<string, string>; children?: El[] }

export type Heading = { level: number; text: string; id: string }
export type Rendered = { nodes: El[]; headings: Heading[] }

/** Un bloc consommé : l'élément produit, et la ligne où reprendre. */
type Block = { node: El; next: number }

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * `idPrefix` préfixe les ancres de la page : huit documents cohabitent dans un
 * seul défilement, et deux d'entre eux ont légitimement une section « Errors ».
 * Le titre de niveau 1 prend le préfixe seul — c'est l'ancre de la page.
 */
export function renderMarkdown(source: string, idPrefix = ''): Rendered {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const nodes: El[] = []
  const headings: Heading[] = []
  let i = 0

  while (i < lines.length) {
    if (lines[i]!.trim() === '') {
      i += 1
      continue
    }

    const block =
      takeFence(lines, i) ??
      takeHeading(lines, i, headings, idPrefix) ??
      takeRule(lines, i) ??
      takeTable(lines, i) ??
      takeQuote(lines, i) ??
      takeList(lines, i, 0) ??
      takeParagraph(lines, i)

    nodes.push(block.node)
    i = block.next
  }

  return { nodes, headings }
}

/* — Blocs ————————————————————————————————————————————————————————————— */

const FENCE = /^```(\w*)\s*$/
const HEADING = /^(#{1,4})\s+(.*)$/
const RULE = /^(?:-{3,}|_{3,})\s*$/
const BULLET = /^( *)(?:[-*]|\d+\.)\s+(.*)$/
const QUOTE = /^>\s?(.*)$/
const CALLOUT = /^\*\*(Note|Tip|Warning)\*\*\s*[—-]?\s*/

function takeFence(lines: string[], i: number): Block | null {
  const opening = FENCE.exec(lines[i]!)
  if (!opening) return null

  const body: string[] = []
  let j = i + 1
  while (j < lines.length && !/^```\s*$/.test(lines[j]!)) body.push(lines[j++]!)

  return { node: codeBlock(opening[1] ?? '', body.join('\n')), next: j + 1 }
}

function takeHeading(lines: string[], i: number, headings: Heading[], prefix: string): Block | null {
  const found = HEADING.exec(lines[i]!)
  if (!found) return null

  const level = found[1]!.length
  const text = found[2]!.trim()
  const slug = slugify(text)
  const id = level === 1 ? prefix || slug : prefix ? `${prefix}-${slug}` : slug

  headings.push({ level, text, id })

  return {
    node: {
      tag: `h${level}`,
      attrs: { id },
      // L'ancre se copie d'un clic droit : une section de référence se cite.
      children: [
        ...renderInline(text),
        { tag: 'a', attrs: { class: 'anchor', href: `#${id}`, 'aria-label': `Link to ${text}` }, children: ['#'] },
      ],
    },
    next: i + 1,
  }
}

function takeRule(lines: string[], i: number): Block | null {
  if (!RULE.test(lines[i]!)) return null
  return { node: { tag: 'hr' }, next: i + 1 }
}

function takeTable(lines: string[], i: number): Block | null {
  const divider = lines[i + 1]
  if (!lines[i]!.trimStart().startsWith('|') || !divider) return null
  if (!/^\s*\|[\s:|-]+\|\s*$/.test(divider)) return null

  const head = row('th', lines[i]!)
  const body: El[] = []
  let j = i + 2
  while (j < lines.length && lines[j]!.trimStart().startsWith('|')) body.push(row('td', lines[j++]!))

  // Un tableau de référence déborde en fenêtre étroite : il défile dans sa
  // propre boîte plutôt que d'imposer un défilement horizontal à la page.
  return {
    node: {
      tag: 'div',
      attrs: { class: 'table-scroll' },
      children: [
        {
          tag: 'table',
          children: [
            { tag: 'thead', children: [head] },
            { tag: 'tbody', children: body },
          ],
        },
      ],
    },
    next: j,
  }
}

function row(cell: 'th' | 'td', line: string): El {
  return { tag: 'tr', children: cells(line).map((text) => ({ tag: cell, children: renderInline(text) })) }
}

/** Découpe une ligne de tableau. `\|` échappe une barre à l'intérieur d'une cellule. */
function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

function takeQuote(lines: string[], i: number): Block | null {
  if (!QUOTE.test(lines[i]!)) return null

  const body: string[] = []
  let j = i
  while (j < lines.length && QUOTE.test(lines[j]!)) body.push(QUOTE.exec(lines[j++]!)![1]!)

  const text = body.join(' ').trim()
  const kind = CALLOUT.exec(text)
  const children: El[] = []

  if (kind) children.push({ tag: 'span', attrs: { class: 'callout-label' }, children: [kind[1]!] })
  children.push({ tag: 'p', children: renderInline(text.replace(CALLOUT, '')) })

  return {
    node: { tag: 'aside', attrs: { class: `callout callout-${(kind?.[1] ?? 'note').toLowerCase()}` }, children },
    next: j,
  }
}

function takeList(lines: string[], i: number, indent: number): Block | null {
  if (item(lines[i], indent) === null) return null

  const children: El[] = []
  let j = i

  while (j < lines.length) {
    const text = item(lines[j], indent)
    if (text === null) break

    // Un item qui court sur plusieurs lignes : la suite est indentée et n'ouvre
    // rien d'autre. Sans ça, la fin d'une phrase repartait en paragraphe.
    const parts = [text]
    j += 1
    while (j < lines.length && continues(lines[j]!, indent)) parts.push(lines[j++]!.trim())

    const inner: El[] = renderInline(parts.join(' '))

    const nested = takeList(lines, j, indent + 2)
    if (nested) {
      inner.push(nested.node)
      j = nested.next
    }
    children.push({ tag: 'li', children: inner })
  }

  return { node: { tag: /^\s*\d/.test(lines[i]!) ? 'ol' : 'ul', children }, next: j }
}

/** Une ligne qui prolonge l'item courant : indentée, et qui n'ouvre pas de bloc. */
function continues(line: string, indent: number): boolean {
  const spaces = line.length - line.trimStart().length
  return line.trim() !== '' && spaces > indent && !startsBlock(line)
}

/** Le texte d'un item au niveau d'indentation demandé, ou `null`. */
function item(line: string | undefined, indent: number): string | null {
  const found = line === undefined ? null : BULLET.exec(line)
  if (!found || found[1]!.length !== indent) return null
  return found[2]!
}

function takeParagraph(lines: string[], i: number): Block {
  const body: string[] = []
  let j = i

  while (j < lines.length && lines[j]!.trim() !== '' && !startsBlock(lines[j]!)) body.push(lines[j++]!)

  return { node: { tag: 'p', children: renderInline(body.join(' ')) }, next: Math.max(j, i + 1) }
}

function startsBlock(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    BULLET.test(line) ||
    line.trimStart().startsWith('|')
  )
}

/* — Blocs de code ————————————————————————————————————————————————————— */

function codeBlock(lang: string, source: string): El {
  return {
    tag: 'figure',
    attrs: { class: 'code' },
    children: [
      {
        tag: 'div',
        attrs: { class: 'code-head' },
        children: [
          { tag: 'span', attrs: { class: 'code-lang' }, children: [lang || 'text'] },
          // Le comportement est posé une fois par délégation dans `main.ts` : un
          // écouteur par bloc, sur une page qui en compte des dizaines, n'a
          // aucune raison d'exister.
          { tag: 'button', attrs: { type: 'button', class: 'code-copy', 'data-copy-code': '' }, children: ['Copy'] },
        ],
      },
      { tag: 'pre', children: [{ tag: 'code', children: highlight(source, lang) }] },
    ],
  }
}

/* — Inline ———————————————————————————————————————————————————————————— */

/* Le code littéral vient en premier dans l'alternance : un `**` à l'intérieur
   d'un `` ` `` est du code, pas du gras. */
const INLINE = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|_([^_]+)_/g

export function renderInline(text: string): El[] {
  const nodes: El[] = []
  let last = 0

  for (const match of text.matchAll(INLINE)) {
    const at = match.index
    if (at > last) nodes.push(text.slice(last, at))
    nodes.push(inlineNode(match))
    last = at + match[0].length
  }

  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function inlineNode(match: RegExpMatchArray): El {
  const [, code, linkText, href, strong, emphasis] = match

  if (code !== undefined) return { tag: 'code', children: [code] }

  if (linkText !== undefined && href !== undefined) {
    // Une cible hors du document part dans un onglet, et jamais avec un
    // `window.opener` ouvert sur elle.
    const external = /^https?:/.test(href)
    return {
      tag: 'a',
      attrs: external ? { href, target: '_blank', rel: 'noreferrer' } : { href },
      children: renderInline(linkText),
    }
  }

  return { tag: strong !== undefined ? 'strong' : 'em', children: renderInline(strong ?? emphasis ?? '') }
}
