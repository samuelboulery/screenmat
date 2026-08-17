/**
 * Prérendu de `/docs`. Les huit documents vivent en Markdown dans
 * `public/docs/` et se servent tels quels ; ce plugin les rend aussi en HTML,
 * une page par document, pour qu'un lecteur sans JavaScript — un moteur de
 * recherche, un aperçu de lien — voie le texte plutôt qu'un `<main>` vide.
 *
 * Un seul rendu, deux branchements : `configureServer` sert `/docs/<slug>/` en
 * développement, `closeBundle` écrit les mêmes pages dans `dist/`. Sans ça, on
 * développerait sur une page que le build ne produit pas.
 *
 * Le gabarit est `docs/index.html` — celui que Vite vient d'émettre au build,
 * donc avec ses URLs d'assets hachées. On y substitue le titre, la description,
 * le sommaire et le corps : jamais on ne réécrit la page à la main.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'
import { escapeAttr, toHtml } from './src/docs/html.ts'
import { renderInline, renderMarkdown, type El, type Heading } from './src/docs/md.ts'
import { PAGES } from './src/docs/pages.ts'

type Doc = { slug: string; title: string; description: string; body: El[]; subs: Heading[] }

export type Options = { siteUrl: string }

export function docsPrerender({ siteUrl }: Options): Plugin {
  let root = process.cwd()
  let outDir = 'dist'

  return {
    name: 'screenmat:docs-prerender',
    apply: () => true,

    configResolved(config) {
      root = config.root
      outDir = config.build.outDir
    },

    // Le domaine n'est écrit qu'à un endroit — `vite.config.ts` — et arrive ici
    // par `siteUrl`. Les pages portent un jeton, jamais l'URL en dur.
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%SITE_URL%', siteUrl),
    },

    // En développement, le gabarit passe par `transformIndexHtml` du serveur :
    // la page servie ici est celle que Vite aurait servie, corps en plus.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const slug = docRoute(req.url)
        if (slug === null) return next()

        void (async () => {
          try {
            const docs = await readDocs(root)
            const raw = await readFile(path.join(root, 'docs/index.html'), 'utf8')
            const template = await server.transformIndexHtml(req.url!, raw)
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(fill(template, docs, slug, siteUrl))
          } catch (error) {
            next(error)
          }
        })()
      })
    },

    async closeBundle() {
      const out = path.join(root, outDir)
      const template = await readFile(path.join(out, 'docs/index.html'), 'utf8')
      const docs = await readDocs(root)

      for (const slug of ['', ...PAGES]) {
        const html = fill(template, docs, slug, siteUrl)
        const dir = path.join(out, 'docs', slug)
        await mkdir(dir, { recursive: true })
        await writeFile(path.join(dir, 'index.html'), html)
      }

      // Écrits ici plutôt que déposés dans `public/` : tous deux citent le
      // domaine, et le domaine n'a qu'un propriétaire.
      await writeFile(path.join(out, 'sitemap.xml'), sitemap(siteUrl))
      await writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`)
    },
  }
}

/* — Lecture des documents —————————————————————————————————————————————— */

async function readDocs(root: string): Promise<Doc[]> {
  const summaries = await readSummaries(root)
  return Promise.all(PAGES.map((slug) => readDoc(root, slug, summaries)))
}

async function readDoc(root: string, slug: string, summaries: Map<string, string>): Promise<Doc> {
  const source = await readFile(path.join(root, 'public/docs', `${slug}.md`), 'utf8')
  const { nodes, headings } = renderMarkdown(source, slug)

  return {
    slug,
    title: headings[0]?.text ?? slug,
    // Entière ici : le sommaire l'affiche en toutes lettres, seule la
    // `meta description` se coupe.
    description: summaries.get(slug) ?? firstParagraph(nodes),
    body: withCopyButton(relink(nodes, slug), slug),
    subs: headings.filter((heading) => heading.level === 2),
  }
}

/**
 * `llms.txt` porte déjà une phrase écrite à la main par document — c'est
 * exactement une `meta description`, et elle est maintenue avec la doc. La
 * reprendre vaut mieux que d'inventer un résumé : le premier paragraphe d'un
 * document n'en est pas un (celui de `cli.md` annonce un bloc de code).
 */
async function readSummaries(root: string): Promise<Map<string, string>> {
  const source = await readFile(path.join(root, 'public/docs/llms.txt'), 'utf8')
  const summaries = new Map<string, string>()

  // Un item court sur plusieurs lignes : on découpe sur les débuts d'item.
  for (const block of source.split(/\n(?=- \[)/)) {
    const found = /^- \[[^\]]+\]\(\/docs\/([a-z-]+)\.md\):\s*([\s\S]+)/.exec(block.trim())
    if (!found) continue
    summaries.set(found[1]!, prose(found[2]!.split(/\n\s*\n/)[0]!))
  }

  return summaries
}

/**
 * Une description est du texte nu : `renderInline` dépouille le Markdown —
 * backticks, gras, liens — puisqu'il sait déjà le lire. La majuscule initiale,
 * elle, se rajoute : dans `llms.txt` la phrase suit un tiret, ici elle est
 * seule.
 */
function prose(text: string): string {
  const raw = text.replace(/\s+/g, ' ').trim()
  const flat = flatten(renderInline(raw))
  // Sauf quand elle s'ouvre sur du code : `render(spec)` n'est pas une phrase,
  // et « Render(spec) » est faux.
  if (raw.startsWith('`')) return flat
  return flat.charAt(0).toUpperCase() + flat.slice(1)
}

/** Le premier paragraphe, aplati — le repli quand `llms.txt` ne cite pas la page. */
function firstParagraph(nodes: El[]): string {
  const first = nodes.find((node) => typeof node !== 'string' && node.tag === 'p')
  return flatten(first ? [first] : []).replace(/\s+/g, ' ').trim()
}

/** Au-delà, un moteur coupe lui-même — autant choisir où. */
function clamp(text: string): string {
  if (text.length <= 155) return text
  return `${text.slice(0, 154).replace(/\s+\S*$/, '')}…`
}

function flatten(nodes: El[]): string {
  return nodes.map((node) => (typeof node === 'string' ? node : flatten(node.children ?? []))).join('')
}

/**
 * Les liens internes de la documentation sont des ancres — héritage du
 * défilement unique, où les huit documents cohabitaient sur une page. Une
 * ancre qui vise un autre document ne pointe plus rien une fois les pages
 * séparées : elle devient une vraie URL.
 *
 * Les `id` sont préfixés par le slug de leur page (`md.ts:97`) : le préfixe dit
 * à qui appartient la cible. Aucun slug n'est le préfixe d'un autre, donc la
 * correspondance est sans ambiguïté.
 */
function relink(nodes: El[], slug: string): El[] {
  return nodes.map((node) => {
    if (typeof node === 'string') return node

    const href = node.attrs?.['href']
    const target = href?.startsWith('#') ? href.slice(1) : null
    const owner = target === null ? null : ownerOf(target)
    const children = node.children ? relink(node.children, slug) : undefined

    if (owner === null || owner === slug) return { ...node, children }

    const url = owner === target ? `/docs/${owner}/` : `/docs/${owner}/#${target}`
    return { ...node, attrs: { ...node.attrs, href: url }, children }
  })
}

function ownerOf(id: string): string | null {
  return PAGES.find((slug) => id === slug || id.startsWith(`${slug}-`)) ?? null
}

/**
 * Le bouton de copie se glisse dans le titre, comme le faisait `main.ts` au
 * runtime. Il entre dans l'arbre plutôt que dans la chaîne : c'est `toHtml` qui
 * échappe, et rien ne doit contourner ce passage.
 */
function withCopyButton(nodes: El[], slug: string): El[] {
  let done = false
  return nodes.map((node) => {
    if (done || typeof node === 'string' || node.tag !== 'h1') return node
    done = true
    const copy: El = {
      tag: 'button',
      attrs: { type: 'button', class: 'page-copy', 'data-copy-page': slug },
      children: ['Copy Markdown'],
    }
    return { ...node, children: [...(node.children ?? []), copy] }
  })
}

/* — Assemblage de la page —————————————————————————————————————————————— */

/** `slug` vide = le sommaire servi sur `/docs/`. */
function fill(template: string, docs: Doc[], slug: string, siteUrl: string): string {
  const doc = docs.find((candidate) => candidate.slug === slug)
  const title = doc ? `${doc.title} — screenmat docs` : 'screenmat — machine door'
  const description = clamp(doc?.description ?? 'Reference for the screenmat Node API, CLI and MCP server.')
  const url = `${siteUrl}/docs/${slug ? `${slug}/` : ''}`
  const body = doc ? [{ tag: 'section', attrs: { class: 'page', id: slug }, children: doc.body }] : summaryPage(docs)

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${escapeAttr(description)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${escapeAttr(title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${escapeAttr(description)}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${escapeAttr(url)}"`)
    .replace(/(<meta name="twitter:title" content=")[^"]*"/, `$1${escapeAttr(title)}"`)
    .replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${escapeAttr(description)}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${escapeAttr(url)}"`)
    .replace(/(<nav id="toc"[^>]*>)<\/nav>/, `$1${toc(docs, slug)}</nav>`)
    .replace(/(<main id="doc"[^>]*>)<\/main>/, `$1${toHtml(body)}</main>`)
}

/** Le sommaire de `/docs/` : les huit documents, leurs vrais liens, leur résumé. */
function summaryPage(docs: Doc[]): El[] {
  return [
    {
      tag: 'section',
      attrs: { class: 'page', id: 'index' },
      children: [
        { tag: 'h1', attrs: { id: 'index' }, children: ['screenmat documentation'] },
        {
          tag: 'p',
          children: [
            'The machine door — a Node API, a command line and an MCP server, all driving the same renderer as the web app.',
          ],
        },
        {
          tag: 'ul',
          children: docs.map((doc) => ({
            tag: 'li',
            children: [
              { tag: 'a', attrs: { href: `/docs/${doc.slug}/` }, children: [doc.title] },
              ` — ${doc.description}`,
            ],
          })),
        },
      ],
    },
  ]
}

/**
 * Le sommaire du rail. Les documents sont de vrais liens entre pages — ce sont
 * eux que suit un crawler ; les sous-titres restent des ancres, et seuls ceux
 * de la page courante s'affichent.
 */
function toc(docs: Doc[], slug: string): string {
  const items: El[] = docs.map((doc) => {
    const current = doc.slug === slug
    const link: El = {
      tag: 'a',
      attrs: {
        class: current ? 'toc-page is-active' : 'toc-page',
        href: `/docs/${doc.slug}/`,
        'data-target': doc.slug,
      },
      children: [doc.title],
    }

    const children: El[] = [link]
    if (current && doc.subs.length > 0) {
      children.push({
        tag: 'ul',
        attrs: { class: 'toc-sub' },
        children: doc.subs.map((heading) => ({
          tag: 'li',
          children: [
            { tag: 'a', attrs: { class: 'toc-item', href: `#${heading.id}`, 'data-target': heading.id }, children: [heading.text] },
          ],
        })),
      })
    }

    const attrs: Record<string, string> = current
      ? { 'data-page': doc.slug, class: 'is-open' }
      : { 'data-page': doc.slug }

    return { tag: 'li', attrs, children }
  })

  return toHtml([{ tag: 'ul', children: items }])
}

/* — Sitemap ——————————————————————————————————————————————————————————— */

function sitemap(siteUrl: string): string {
  const urls = ['/', '/docs/', ...PAGES.map((slug) => `/docs/${slug}/`)]
  const entries = urls.map((url) => `  <url><loc>${escapeAttr(siteUrl + url)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

/* — Utilitaires ———————————————————————————————————————————————————————— */

/** `/docs/` ou `/docs/<slug>/`, et rien d'autre — surtout pas `/docs/cli.md`. */
function docRoute(url: string | undefined): string | null {
  const pathname = url?.split('?')[0] ?? ''
  if (pathname === '/docs' || pathname === '/docs/') return ''
  const found = /^\/docs\/([a-z-]+)\/$/.exec(pathname)
  const slug = found?.[1]
  return slug !== undefined && (PAGES as readonly string[]).includes(slug) ? slug : null
}
