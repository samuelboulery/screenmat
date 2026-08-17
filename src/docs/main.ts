/**
 * La page `/docs`. Elle ne détient aucun contenu : les huit documents vivent en
 * Markdown dans `public/docs/`, sont servis tels quels — un LLM, `curl` ou
 * GitHub les lisent sans passer par ici — et cette page les met en forme.
 *
 * Tout est chargé dans un seul défilement : les ancres sont natives, `⌘F`
 * cherche dans toute la documentation, et « Copy all » n'a rien à recoller.
 */
import './docs.css'
import { toDom } from './dom.ts'
import { renderMarkdown, type Heading } from './md.ts'

/** L'ordre de lecture. Le même que celui de `public/docs/llms.txt`. */
const PAGES = ['overview', 'cli', 'mcp', 'api', 'scene', 'coordinates', 'styles', 'recipes'] as const

type Page = { slug: string; title: string; source: string; headings: Heading[] }

const doc = document.getElementById('doc')!
const toc = document.getElementById('toc')!

const pages = await load()
if (pages.length > 0) {
  buildToc(pages)
  wireCopy(pages)
  wireSpy(pages)
  jumpToHash()
}

/* — Chargement ———————————————————————————————————————————————————————— */

async function load(): Promise<Page[]> {
  let sources: string[]
  try {
    sources = await Promise.all(PAGES.map(fetchPage))
  } catch (error) {
    // Pas de `catch` muet : une page vide sans explication est pire que l'erreur.
    doc.append(errorNote(error))
    return []
  }

  return PAGES.map((slug, index) => renderPage(slug, sources[index]!))
}

async function fetchPage(slug: string): Promise<string> {
  const response = await fetch(`./${slug}.md`)
  if (!response.ok) throw new Error(`${slug}.md — HTTP ${response.status}`)
  return response.text()
}

function renderPage(slug: string, source: string): Page {
  const section = document.createElement('section')
  section.className = 'page'
  section.id = slug

  const { nodes, headings } = renderMarkdown(source, slug)
  section.append(toDom(nodes))

  // Le bouton se glisse dans le titre de la page : la copie porte sur ce
  // document-là, et le geste vit à côté de ce qu'il manipule.
  const copy = document.createElement('button')
  copy.type = 'button'
  copy.className = 'page-copy'
  copy.dataset.copyPage = slug
  copy.textContent = 'Copy Markdown'
  section.querySelector('h1')?.append(copy)

  doc.append(section)
  return { slug, title: headings[0]?.text ?? slug, source, headings }
}

function errorNote(error: unknown): HTMLElement {
  const note = document.createElement('p')
  note.className = 'load-error'
  note.textContent = `Documentation unavailable — ${error instanceof Error ? error.message : String(error)}`
  return note
}

/* — Sommaire —————————————————————————————————————————————————————————— */

function buildToc(pages: Page[]): void {
  const list = document.createElement('ul')

  for (const page of pages) {
    const item = document.createElement('li')
    item.dataset.page = page.slug
    item.append(tocLink(page.slug, page.title, 'toc-page'))

    const sub = document.createElement('ul')
    sub.className = 'toc-sub'
    for (const heading of page.headings.filter((h) => h.level === 2)) {
      const child = document.createElement('li')
      child.append(tocLink(heading.id, heading.text, 'toc-item'))
      sub.append(child)
    }
    if (sub.childElementCount > 0) item.append(sub)

    list.append(item)
  }

  toc.append(list)
}

function tocLink(id: string, text: string, className: string): HTMLAnchorElement {
  const link = document.createElement('a')
  link.href = `#${id}`
  link.className = className
  link.dataset.target = id
  link.textContent = text
  return link
}

/* — Repérage dans le défilement ——————————————————————————————————————— */

/** ponytail: balayage linéaire des titres à chaque frame de défilement. Une
 *  soixantaine de titres, une comparaison chacun — un IntersectionObserver
 *  coûterait plus de code pour la même réponse. */
function wireSpy(pages: Page[]): void {
  const marks = pages.flatMap((page) =>
    page.headings
      .filter((heading) => heading.level <= 2)
      .map((heading) => ({ page: page.slug, id: heading.id })),
  )

  let queued = false
  const update = () => {
    queued = false
    let current = marks[0]!
    for (const mark of marks) {
      const top = document.getElementById(mark.id)?.getBoundingClientRect().top ?? Infinity
      if (top > 96) break
      current = mark
    }
    highlightToc(current)
  }

  addEventListener(
    'scroll',
    () => {
      if (queued) return
      queued = true
      requestAnimationFrame(update)
    },
    { passive: true },
  )
  update()
}

function highlightToc({ page, id }: { page: string; id: string }): void {
  for (const link of toc.querySelectorAll<HTMLAnchorElement>('a')) {
    link.classList.toggle('is-active', link.dataset.target === id)
  }
  for (const item of toc.querySelectorAll<HTMLLIElement>('li[data-page]')) {
    item.classList.toggle('is-open', item.dataset.page === page)
  }
}

function jumpToHash(): void {
  // Le contenu arrive après le chargement du document : le saut natif a déjà eu
  // lieu dans le vide.
  const target = location.hash.slice(1)
  if (target) document.getElementById(target)?.scrollIntoView()
}

/* — Copie ————————————————————————————————————————————————————————————— */

function wireCopy(pages: Page[]): void {
  const whole = () => pages.map((page) => page.source.trim()).join('\n\n')

  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest('button')
    if (!(button instanceof HTMLButtonElement)) return

    if (button.dataset.copyCode !== undefined) {
      const code = button.closest('figure')?.querySelector('code')?.textContent ?? ''
      void copy(button, code)
      return
    }

    const slug = button.dataset.copyPage
    if (slug) {
      void copy(button, pages.find((page) => page.slug === slug)?.source ?? '')
      return
    }

    if (button.id === 'copy-all') void copy(button, whole())
  })
}

async function copy(button: HTMLButtonElement, text: string): Promise<void> {
  const label = button.textContent ?? ''
  try {
    await navigator.clipboard.writeText(text)
    button.textContent = 'Copied'
  } catch {
    // Presse-papier refusé (contexte non sécurisé, permission) : le dire, plutôt
    // que laisser croire à une copie qui n'a pas eu lieu.
    button.textContent = 'Copy failed'
  }
  setTimeout(() => {
    button.textContent = label
  }, 1400)
}
