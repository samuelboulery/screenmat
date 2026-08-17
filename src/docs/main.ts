/**
 * La page `/docs`. Elle ne détient aucun contenu et n'en rend plus aucun : les
 * huit documents vivent en Markdown dans `public/docs/`, sont servis tels quels
 * — un LLM, `curl` ou GitHub les lisent sans passer par ici — et
 * `vite-docs-prerender.ts` les met en forme **au build**. Ce fichier ne câble
 * que le comportement.
 *
 * Une page par document, à `/docs/<slug>/` : le texte est dans le HTML servi,
 * donc lisible sans JavaScript et indexable. Ce que ça coûte, et qu'il faut
 * savoir : `⌘F` ne cherche plus que dans le document courant. « Copy all » et
 * `llms.txt` restent le chemin pour tout prendre d'un bloc.
 */
import './docs.css'
import { PAGES } from './pages.ts'

const doc = document.getElementById('doc')!
const toc = document.getElementById('toc')!

if (doc.childElementCount === 0) {
  // Pas de `catch` muet, et pas de second moteur de rendu tenu en réserve : si
  // le prérendu a manqué, le dire vaut mieux que d'embarquer tout `md.ts` dans
  // le navigateur pour un cas qui n'arrive pas.
  const note = document.createElement('p')
  note.className = 'load-error'
  note.textContent = 'Documentation unavailable — the page was served without its prerendered content.'
  doc.append(note)
} else {
  wireCopy()
  wireSpy()
}

/* — Repérage dans le défilement ——————————————————————————————————————— */

/** ponytail: balayage linéaire des titres à chaque frame de défilement. Une
 *  dizaine de titres par page désormais — un IntersectionObserver coûterait
 *  plus de code pour la même réponse. */
function wireSpy(): void {
  const marks = [...doc.querySelectorAll<HTMLElement>('h1[id], h2[id]')]
  if (marks.length === 0) return

  let queued = false
  const update = () => {
    queued = false
    let current = marks[0]!
    for (const mark of marks) {
      if (mark.getBoundingClientRect().top > 96) break
      current = mark
    }
    for (const link of toc.querySelectorAll<HTMLAnchorElement>('a')) {
      link.classList.toggle('is-active', link.dataset.target === current.id)
    }
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

/* — Copie ————————————————————————————————————————————————————————————— */

/** Les sources ne sont plus chargées au démarrage : seul un clic les réclame. */
const sources = new Map<string, string>()

async function fetchSource(slug: string): Promise<string> {
  const cached = sources.get(slug)
  if (cached !== undefined) return cached

  const response = await fetch(`/docs/${slug}.md`)
  if (!response.ok) throw new Error(`${slug}.md — HTTP ${response.status}`)

  const text = (await response.text()).trim()
  sources.set(slug, text)
  return text
}

function wireCopy(): void {
  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest('button')
    if (!(button instanceof HTMLButtonElement)) return

    if (button.dataset.copyCode !== undefined) {
      const code = button.closest('figure')?.querySelector('code')?.textContent ?? ''
      void copy(button, Promise.resolve(code))
      return
    }

    const slug = button.dataset.copyPage
    if (slug) {
      void copy(button, fetchSource(slug))
      return
    }

    if (button.id === 'copy-all') {
      void copy(button, Promise.all(PAGES.map(fetchSource)).then((all) => all.join('\n\n')))
    }
  })
}

async function copy(button: HTMLButtonElement, text: Promise<string>): Promise<void> {
  const label = button.textContent ?? ''
  try {
    await navigator.clipboard.writeText(await text)
    button.textContent = 'Copied'
  } catch {
    // Presse-papier refusé, ou source injoignable : le dire, plutôt que laisser
    // croire à une copie qui n'a pas eu lieu.
    button.textContent = 'Copy failed'
  }
  setTimeout(() => {
    button.textContent = label
  }, 1400)
}
