import { describe, expect, it } from 'vitest'
import { toHtml } from '../html.ts'
import { renderMarkdown, type El } from '../md.ts'

/** Aplatit l'arbre en texte : ce qu'un lecteur verrait, balises exclues. */
function text(nodes: El[]): string {
  return nodes.map((node) => (typeof node === 'string' ? node : text(node.children ?? []))).join('')
}

describe('toHtml', () => {
  it('échappe le texte : un `<script>` venu du Markdown ressort inerte', () => {
    // Le cas qui justifie ce fichier. `toDom` l'obtenait de `createTextNode` ;
    // ici il faut le faire à la main, ou on sert une injection.
    const { nodes } = renderMarkdown('Écrire <script>alert(1)</script> & rien de plus.')
    const html = toHtml(nodes)

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&amp;')
  })

  it('échappe le texte à l\'intérieur d\'un bloc de code', () => {
    const { nodes } = renderMarkdown('```html\n<script>alert(1)</script>\n```')
    const html = toHtml(nodes)

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('échappe les guillemets et les chevrons dans une valeur d\'attribut', () => {
    // Un titre tordu produit un `id` et un `href` d'ancre : ils ne doivent pas
    // pouvoir refermer l'attribut.
    const nodes: El[] = [{ tag: 'a', attrs: { href: '"><script>x</script>', title: 'a & b' }, children: ['ok'] }]
    const html = toHtml(nodes)

    expect(html).toBe('<a href="&quot;&gt;&lt;script&gt;x&lt;/script&gt;" title="a &amp; b">ok</a>')
  })

  it('ferme seuls les éléments vides', () => {
    expect(toHtml(renderMarkdown('---').nodes)).toBe('<hr>')
  })

  it('sérialise attributs et enfants imbriqués', () => {
    const { nodes } = renderMarkdown('# Titre')
    const html = toHtml(nodes)

    expect(html).toContain('<h1 id="titre">')
    expect(html).toContain('</h1>')
    expect(html).toContain('class="anchor"')
  })

  it('rend le même texte visible que l\'arbre dont il sort', () => {
    const source = [
      '# Coordinates',
      '',
      'Rects are fractions of the **window width**, `y` included.',
      '',
      '| Field | Bounds |',
      '| --- | --- |',
      '| `x` | 0..1 |',
      '',
      '- premier item',
      '- second item',
      '',
      '> **Note** — lire ceci avant de placer une annotation.',
    ].join('\n')
    const { nodes } = renderMarkdown(source, 'coordinates')

    // Le texte du HTML, balises retirées et entités rendues, est celui de
    // l'arbre : la sérialisation ne perd ni n'invente de contenu.
    const stripped = toHtml(nodes)
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')

    expect(stripped).toBe(text(nodes))
  })
})
