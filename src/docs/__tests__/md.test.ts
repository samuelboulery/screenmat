import { describe, expect, it } from 'vitest'
import { renderMarkdown, slugify, type El } from '../md.ts'

/** Aplatit l'arbre en texte : ce qu'un lecteur verrait, balises exclues. */
function text(nodes: El[]): string {
  return nodes
    .map((node) => (typeof node === 'string' ? node : text(node.children ?? [])))
    .join('')
}

/** Le premier élément portant ce tag, en profondeur d'abord. */
function find(nodes: El[], tag: string): Extract<El, { tag: string }> | undefined {
  for (const node of nodes) {
    if (typeof node === 'string') continue
    if (node.tag === tag) return node
    const deeper = find(node.children ?? [], tag)
    if (deeper) return deeper
  }
  return undefined
}

describe('slugify', () => {
  it('supprime les diacritiques et la ponctuation', () => {
    expect(slugify('Repère des calques !')).toBe('repere-des-calques')
  })
})

describe('renderMarkdown', () => {
  it('donne au titre de page l’ancre du préfixe, et préfixe les suivantes', () => {
    const { nodes, headings } = renderMarkdown('# Scene format\n\n## Errors\n', 'scene')

    expect(headings).toEqual([
      { level: 1, text: 'Scene format', id: 'scene' },
      { level: 2, text: 'Errors', id: 'scene-errors' },
    ])
    expect(find(nodes, 'h1')?.attrs?.id).toBe('scene')
    expect(find(nodes, 'a')?.attrs?.href).toBe('#scene')
  })

  it('rend un bloc de code avec sa langue et son bouton de copie', () => {
    const { nodes } = renderMarkdown('```bash\nscreenmat a.png --scale 3\n```\n')

    expect(find(nodes, 'span')?.children).toEqual(['bash'])
    expect(find(nodes, 'button')?.attrs?.['data-copy-code']).toBe('')
    expect(text(find(nodes, 'code')?.children ?? [])).toBe('screenmat a.png --scale 3')
  })

  it('ne colore pas un bloc `text` — c’est le langage des schémas ASCII', () => {
    const { nodes } = renderMarkdown('```text\n+--- window ---+\n```\n')
    expect(find(nodes, 'code')?.children).toEqual(['+--- window ---+'])
  })

  it('rend un tableau avec en-tête et cellules', () => {
    const { nodes } = renderMarkdown('| Flag | Default |\n| --- | --- |\n| `--scale` | 2 |\n')

    const rows = find(nodes, 'table')?.children ?? []
    expect(text(rows)).toBe('FlagDefault--scale2')
    expect(find(rows, 'th')?.children).toEqual(['Flag'])
    expect(find(rows, 'code')?.children).toEqual(['--scale'])
  })

  it('imbrique une liste indentée dans son item parent', () => {
    const { nodes } = renderMarkdown('- shots\n  - input\n- scale\n')

    const list = find(nodes, 'ul')!
    expect(list.children).toHaveLength(2)
    expect(text([list.children![0]!])).toBe('shotsinput')
  })

  it('recolle un item qui court sur deux lignes', () => {
    const { nodes } = renderMarkdown('- Recall a style by name, so a machine\n  never restates a dozen settings.\n')

    const list = find(nodes, 'ul')!
    expect(list.children).toHaveLength(1)
    expect(text(list.children!)).toBe('Recall a style by name, so a machine never restates a dozen settings.')
  })

  it('reconnaît un encart et son étiquette', () => {
    const { nodes } = renderMarkdown('> **Warning** — never overwrites.\n')

    const aside = find(nodes, 'aside')!
    expect(aside.attrs?.class).toBe('callout callout-warning')
    expect(text(aside.children ?? [])).toBe('Warningnever overwrites.')
  })

  it('marque un lien externe, pas un lien d’ancre', () => {
    const { nodes } = renderMarkdown('See [spec](https://example.com) and [above](#cli).\n')

    const links = (find(nodes, 'p')?.children ?? []).filter(
      (node): node is Extract<El, { tag: string }> => typeof node !== 'string' && node.tag === 'a',
    )
    expect(links[0]?.attrs).toEqual({ href: 'https://example.com', target: '_blank', rel: 'noreferrer' })
    expect(links[1]?.attrs).toEqual({ href: '#cli' })
  })

  it('ne produit aucune balise à partir du texte source', () => {
    const { nodes } = renderMarkdown('A <script>alert(1)</script> tag.\n')

    // Le `<script>` reste du texte : le rendu ne fabrique que les éléments
    // qu'il décide lui-même, jamais ceux écrits dans la source.
    expect(find(nodes, 'script')).toBeUndefined()
    expect(text(nodes)).toBe('A <script>alert(1)</script> tag.')
  })
})
