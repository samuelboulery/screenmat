import { loadImage, pickImage } from '../lib/image.ts'
import { extractPalette } from '../lib/palette.ts'
import { putHandoff } from '../lib/store.ts'
import type { Annotation, Palette } from '../types.ts'
import { type Rgb } from '../lib/dither.ts'
import { ditherImage } from './dither-image.ts'
import { createMarks, flyIn, moveMarks, snapMarks } from './marks.ts'
import { HERO_KEYS, heroLayer, heroScene, type HeroKey } from './scene.ts'
import { createStage, easeInOut } from './stage.ts'

type Source = { image: HTMLImageElement; palette: Palette; blob: Blob; name: string; demo: boolean }

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const rgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]

/**
 * La vitrine « Signature » : les équerres se referment sur une capture tramée,
 * elle se développe, puis le vrai moteur la cadre. Ensuite T, A, R et B y
 * posent de vrais calques ; ⌘V, un dépôt ou un fichier y font passer sa propre
 * capture, que « Continue in editor » emporte dans `/app/`.
 */
export function startHero(root: HTMLElement): void {
  const find = <T extends HTMLElement>(selector: string) => {
    const found = root.querySelector<T>(selector)
    if (!found) throw new Error(`Landing markup is missing ${selector}`)
    return found
  }
  const frame = find<HTMLElement>('[data-hero-frame]')
  const stage = createStage(find<HTMLCanvasElement>('canvas'), () => token('--color-ink'))
  const marks = createMarks(find('[data-hero-marks]'))
  const keys = find('[data-hero-keys]')
  const hint = find('[data-hero-hint]')
  const caption = find('[data-hero-caption]')
  const proceed = find<HTMLButtonElement>('[data-hero-continue]')
  const file = find<HTMLInputElement>('input[type=file]')

  let source: Source | null = null
  let layers: Annotation[] = []
  let counts: Record<HeroKey, number> = { t: 0, a: 0, r: 0, b: 0 }
  let run = 0
  let loads = 0
  let ready = false
  let pending = 0

  const scene = () => heroScene(source!.image, source!.palette, layers)
  const say = (text: string) => (hint.textContent = text)
  const whole = () => ({ x: 0, y: 0, w: stage.width, h: stage.height })
  const fail = (cause: unknown) => say(cause instanceof Error ? cause.message : 'The demo stopped.')
  const start = () => void intro().catch(fail)
  /** Un redimensionnement par frame au plus : trame et rendu coûtent cher. */
  const schedule = () => {
    if (!pending) pending = requestAnimationFrame(() => ((pending = 0), layout()))
  }

  function dither() {
    if (!source) return
    stage.dithered = ditherImage(source.image, Math.max(40, Math.round(stage.raw().w / 2.2)), rgb(token('--color-stage')), rgb(token('--color-ink')))
  }

  function layout() {
    if (!source) return
    stage.resize()
    dither()
    stage.render(scene())
    snapMarks(marks, stage.frame > 0 ? whole() : stage.raw(), stage.frame > 0)
    stage.draw()
  }

  async function intro() {
    const me = ++run
    const alive = () => me === run
    stage.cancel()
    Object.assign(stage, { develop: 0, frame: 0, fade: 1, shot: source!.image })
    layers = []
    counts = { t: 0, a: 0, r: 0, b: 0 }
    setReady(false)
    caption.textContent = `${source!.name} · ${source!.image.naturalWidth} × ${source!.image.naturalHeight}`
    layout()
    await flyIn(marks, stage.raw())
    if (!alive()) return
    await stage.tween(1100, (k) => (stage.develop = k), easeInOut)
    if (!alive()) return
    moveMarks(marks, whole(), 950)
    await stage.tween(950, (k) => (stage.frame = k))
    if (!alive()) return
    caption.textContent = 'screenmat.webp · 3200 × 2400 · background from its own colours'
    // `alive()` avant chaque calque : une autre capture a pu arriver entre-temps.
    for (const key of source!.demo ? (['r', 't', 'a'] as const) : []) {
      if (!alive()) return
      await add(key)
    }
    if (alive()) setReady(true)
  }

  function setReady(on: boolean) {
    ready = on
    keys.dataset.ready = String(on)
    keys.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => (button.disabled = !on))
  }

  function add(key: HeroKey): Promise<void> {
    layers = [...layers, heroLayer(key, counts[key]++, source!.image.naturalHeight / source!.image.naturalWidth, source!.demo)]
    return crossfade()
  }

  function crossfade(): Promise<void> {
    stage.render(scene())
    stage.fade = 0
    return stage.tween(320, (k) => (stage.fade = k))
  }

  function press(key: HeroKey) {
    if (!ready) return
    add(key).catch(fail)
    say(`${HERO_KEYS[key]} added${key === 'b' ? ' — baked into the pixels' : ''} · ⌫ to undo`)
  }

  function undo() {
    if (!ready || layers.length === 0) return
    layers = layers.slice(0, -1)
    crossfade().catch(fail)
  }

  async function use(blob: Blob, name: string, demo: boolean) {
    // La démo arrivée après une capture collée ne la remplace pas ; de deux
    // collages, le dernier gagne.
    if (demo && source) return
    const me = ++loads
    try {
      const image = await loadImage(blob)
      if (me !== loads || (demo && source)) return
      source = { image, palette: extractPalette(image), blob, name, demo }
      proceed.hidden = demo
      if (!demo) say('Your screenshot, rendered locally. Try T A R B.')
      start()
    } catch (cause: unknown) {
      say(cause instanceof Error ? cause.message : 'That file could not be read as an image.')
    }
  }

  wireInputs({ frame, keys, file, proceed, press, undo, replay: () => source && start(), use, say, source: () => source })
  new ResizeObserver(schedule).observe(frame)
  // Le thème change la trame : encre sur papier, papier sur encre.
  new MutationObserver(schedule).observe(document.documentElement, { attributeFilter: ['data-theme'] })

  void fetch('/landing/demo.webp')
    .then((response) => {
      if (!response.ok) throw new Error(`Demo capture unavailable (${response.status})`)
      return response.blob()
    })
    .then((blob) => use(blob, 'raw.png', true))
    .catch((cause: unknown) => say(cause instanceof Error ? cause.message : 'The demo could not load.'))
}

type Inputs = {
  frame: HTMLElement
  keys: HTMLElement
  file: HTMLInputElement
  proceed: HTMLButtonElement
  press: (key: HeroKey) => void
  undo: () => void
  replay: () => void
  use: (blob: Blob, name: string, demo: boolean) => Promise<void>
  say: (text: string) => void
  source: () => Source | null
}

/**
 * Les entrées de la vitrine. Les touches nues ne valent que quand le focus est
 * dans la vitrine (WCAG 2.1.4) — un clic sur le cadre l'y met. ⌘V et le dépôt,
 * eux, valent sur toute la page : c'est le geste qu'on veut encourager.
 */
function wireInputs(inputs: Inputs): void {
  const { frame, keys, file, proceed, press, undo, replay, use, say, source } = inputs
  const show = frame.closest<HTMLElement>('[data-hero]') ?? frame

  frame.addEventListener('pointerdown', () => frame.focus())
  show.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const key = event.key.toLowerCase()
    if (key in HERO_KEYS) {
      event.preventDefault()
      press(key as HeroKey)
    } else if (key === 'backspace') {
      event.preventDefault()
      undo()
    }
  })
  keys.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) =>
    button.addEventListener('click', () => press(button.dataset.key as HeroKey)),
  )
  keys.querySelector('[data-replay]')?.addEventListener('click', replay)
  keys.querySelector('[data-paste]')?.addEventListener('click', () => say('Copy a screenshot, then press ⌘V anywhere on this page — or drop it on the frame.'))
  show.querySelector('[data-pick]')?.addEventListener('click', () => file.click())

  const take = (picked: File | null) => {
    if (picked) void use(picked, picked.name || 'pasted.png', false)
    else say('No image in there. Paste a screenshot, or drop a PNG, JPEG or WebP.')
  }
  file.addEventListener('change', () => take(pickImage(file.files)))
  addEventListener('paste', (event) => {
    const picked = pickImage(event.clipboardData?.items ?? null)
    if (!picked) return
    event.preventDefault()
    take(picked)
  })
  // Seul un dépôt de fichier nous regarde : un lien ou du texte glissé suit son cours.
  const files = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false
  addEventListener('dragover', (event) => {
    if (!files(event)) return
    event.preventDefault()
    frame.dataset.drop = ''
  })
  addEventListener('dragleave', (event) => {
    if (!event.relatedTarget) delete frame.dataset.drop
  })
  addEventListener('drop', (event) => {
    if (!files(event)) return
    event.preventDefault()
    delete frame.dataset.drop
    take(pickImage(event.dataTransfer?.items ?? null))
  })

  proceed.addEventListener('click', () => {
    const current = source()
    if (!current) return
    putHandoff({ blob: current.blob, name: current.name.replace(/\.[a-z0-9]+$/i, '') })
      .then(() => location.assign('/app/'))
      .catch((cause: unknown) => say(cause instanceof Error ? cause.message : 'Could not hand the screenshot to the editor.'))
  })
}
