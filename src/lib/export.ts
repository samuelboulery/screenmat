import { harmonizePalettes } from './palette.ts'
import { renderScene } from './render.ts'
import { makeZip, type ZipEntry } from './zip.ts'
import type { Format, Palette, Ratio, Scene, Settings, Shot } from '../types.ts'

const MIME: Record<Format, string> = {
  png: 'image/png',
  webp: 'image/webp',
}

/** Assez haut pour qu'aucun artefact ne soit visible sur un aplat dégradé. */
const WEBP_QUALITY = 0.92

/** Ce navigateur sait-il encoder du WebP. Sondé une fois : un canvas de 1 px
 *  qui ne sait pas répond en PNG. Sans ça, un défaut WebP casserait chaque
 *  export là où l'encodeur manque, au lieu d'y peser dix fois moins. */
let webp: boolean | null = null

export function supportsWebp(): boolean {
  if (webp !== null) return webp
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  webp = canvas.toDataURL(MIME.webp).startsWith(`data:${MIME.webp}`)
  return webp
}

/** Les réglages par défaut tels que ce navigateur peut vraiment les tenir. */
export function supportedDefaults(settings: Settings): Settings {
  return settings.format === 'webp' && !supportsWebp() ? { ...settings, format: 'png' } : settings
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: Format): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Un navigateur sans encodeur WebP renvoie soit `null`, soit un PNG :
        // dans les deux cas il ne faut pas livrer un fichier qui ment sur son
        // extension.
        if (!blob) {
          reject(new Error(`Le navigateur n'a pas pu encoder le ${format.toUpperCase()}`))
          return
        }
        if (blob.type !== MIME[format]) {
          reject(new Error(`${format.toUpperCase()} non supporté par ce navigateur`))
          return
        }
        resolve(blob)
      },
      MIME[format],
      format === 'webp' ? WEBP_QUALITY : undefined,
    )
  })
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Révoquer dans la foulée du clic coupe l'URL sous le téléchargement, qui la
  // consomme de façon asynchrone : selon le navigateur, le fichier n'arrive
  // jamais, et sans le moindre message.
  // ponytail: délai fixe. Un `<iframe>` porteur du blob permettrait de révoquer
  // sur son `load`, si un jour un export tarde plus que ça.
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

/** De quoi laisser partir un gros export sur une machine chargée. */
const REVOKE_DELAY_MS = 60_000

/** `astonishing-lokum.netlify.app` → `astonishing-lokum-netlify-app`. */
export function slug(url: string): string {
  const cleaned = url
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return cleaned.slice(0, 48) || 'shotframe'
}

export function exportFilename(url: string, scale: number, format: Format): string {
  return `${slug(url)}-${scale}x.${format}`
}

/** `{shot}-{ratio}@3x` → `01-16-9@3x.webp`. Le seul gabarit accepté. */
export function batchFilename(
  shot: string,
  ratio: Ratio,
  scale: number,
  format: Format,
): string {
  return `${slug(shot)}-${ratio.replace(':', '-')}@${scale}x.${format}`
}

export function humanSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

/**
 * Rend la scène dans un canvas hors écran. Passe par `renderScene`, exactement
 * comme la preview : c'est ce qui garantit que le fichier correspond à ce qui
 * était à l'écran. Rien n'est réimplémenté ici.
 *
 * ponytail: canvas plein cadre en mémoire — 4800×3600 en 3× tient largement sur
 * un desktop. Passer par des tuiles si un jour on vise iOS, qui plafonne la
 * surface d'un canvas autour de 16,7 Mpx.
 */
export async function renderToBlob(scene: Scene, scale: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponible')

  renderScene(context, scene, scale)
  return canvasToBlob(canvas, scene.settings.format)
}

/** Rend puis télécharge. Le chemin nominal du bouton « Export ». */
export async function exportScene(scene: Scene, scale: number): Promise<Blob> {
  const blob = await renderToBlob(scene, scale)
  triggerDownload(blob, exportFilename(scene.settings.url, scale, scene.settings.format))
  return blob
}

/**
 * Copie le rendu dans le presse-papier. Le PNG est le seul format que tous les
 * navigateurs acceptent dans un `ClipboardItem` : on force donc l'encodage,
 * quel que soit le format d'export choisi.
 */
export async function copyScene(scene: Scene, scale: number): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('Presse-papier image non supporté par ce navigateur')
  }

  const png: Scene = { ...scene, settings: { ...scene.settings, format: 'png' } }
  const blob = await renderToBlob(png, scale)
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export type BatchJob = {
  /** Shot dont ce fichier est issu : un shot peut produire plusieurs ratios. */
  shotId: string
  /** Nom de base du fichier (celui du shot). */
  name: string
  scene: Scene
  ratio: Ratio
  scale: number
}

/**
 * Développe une sélection de shots × ratios en fichiers à rendre. Chaque job
 * repart de la scène courante mais n'y garde qu'un shot et force le layout
 * `single` : un lot produit des visuels individuels, pas des compositions.
 *
 * `harmonize` aligne l'intensité des palettes du lot sans toucher à leur teinte
 * — l'entre-deux entre un fond par capture et l'uniformité totale d'une palette
 * imposée par un style, qui reste prioritaire quand elle existe.
 */
export function buildBatchJobs(
  scene: Scene,
  shots: readonly Shot[],
  ratios: readonly Ratio[],
  scale: number,
  palette?: Palette,
  harmonize = false,
): BatchJob[] {
  const palettes = harmonize
    ? harmonizePalettes(shots.map((shot) => shot.palette))
    : shots.map((shot) => shot.palette)

  return shots.flatMap((shot, index) =>
    ratios.map((ratio) => ({
      shotId: shot.id,
      name: shot.name,
      ratio,
      scale,
      scene: {
        ...scene,
        shots: [shot],
        palette: palette ?? palettes[index],
        composition: { ...scene.composition, layout: 'single' as const },
        settings: { ...scene.settings, ratio },
      },
    })),
  )
}

export type BatchProgress = {
  index: number
  total: number
  shotId: string
  name: string
}

/**
 * Encodages menés de front. Mesuré à l'échelle 3 : le rendu d'un item coûte
 * 36 ms, son encodage PNG 1 228 ms — soit 97 % du temps d'un lot, et
 * `canvas.toBlob` l'exécute déjà hors du thread principal. Les enchaîner
 * laissait donc le processeur inoccupé l'essentiel du temps.
 *
 * ponytail: trois de front, parce que chaque item en vol retient son canvas —
 * 69 Mo à l'échelle 3. Monter ce nombre demande de mesurer la mémoire, pas
 * seulement le temps.
 */
const CONCURRENT_ENCODES = 3

/**
 * Rend une file d'attente et empaquette le résultat.
 *
 * Le rendu de chaque item reste synchrone et dans le thread principal — 36 ms,
 * et l'ordre garantit que le cache de fond sert quand deux items partagent leurs
 * réglages. Ce sont les encodages qui se recouvrent. La main est rendue entre
 * chaque item (`yieldToBrowser`) et `shouldCancel` consulté avant chacun.
 *
 * Un Worker + `OffscreenCanvas` n'est PAS la réponse : il déplacerait les 3 %
 * qui ne sont pas déjà hors du fil principal, au prix du portage de
 * `renderScene`. Mesuré, un lot de 12 items en 3× ne produit aucune tâche
 * longue — l'UI ne gèle pas, elle attend l'encodeur.
 */
export async function runBatch(
  jobs: readonly BatchJob[],
  options: {
    shouldCancel?: () => boolean
    onProgress?: (progress: BatchProgress) => void
    onItem?: (shotId: string, blob: Blob) => void
  } = {},
): Promise<Blob> {
  // Indexé plutôt qu'empilé : les encodages finissent dans le désordre, l'archive
  // doit rester dans celui de la file.
  const entries: (ZipEntry | undefined)[] = new Array(jobs.length)
  const running = new Set<Promise<void>>()
  // Une erreur ne doit ni se perdre ni se signaler deux fois : un `throw` depuis
  // un encodage en vol n'a personne pour l'attendre au moment où il tombe.
  let failure: unknown = null

  for (const [index, job] of jobs.entries()) {
    if (options.shouldCancel?.() || failure) break

    options.onProgress?.({ index, total: jobs.length, shotId: job.shotId, name: job.name })
    await yieldToBrowser()
    if (running.size >= CONCURRENT_ENCODES) await Promise.race(running)

    // Le corps s'exécute jusqu'au premier `await` : le rendu, lui, reste bien
    // sérialisé ici, seul l'encodage part en parallèle.
    const task = (async () => {
      try {
        const blob = await renderToBlob(job.scene, job.scale)
        const filename = batchFilename(job.name, job.ratio, job.scale, job.scene.settings.format)
        entries[index] = { name: filename, data: new Uint8Array(await blob.arrayBuffer()) }
        options.onItem?.(job.shotId, blob)
      } catch (cause: unknown) {
        failure ??= cause
      }
    })()

    running.add(task)
    // Le corps rattrape tout : cette promesse ne rejette jamais, la retirer du
    // lot suffit.
    void task.then(() => running.delete(task))
  }

  await Promise.all(running)
  if (failure) throw failure

  return makeZip(entries.filter((entry): entry is ZipEntry => entry !== undefined))
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 60 })
    else setTimeout(resolve, 0)
  })
}
