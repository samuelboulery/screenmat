import { harmonizePalettes } from './palette.ts'
import { renderScene } from './render.ts'
import { makeZip, type ZipEntry } from './zip.ts'
import type { Format, Palette, Ratio, Scene, Shot } from '../types.ts'

const MIME: Record<Format, string> = {
  png: 'image/png',
  webp: 'image/webp',
}

/** Assez haut pour qu'aucun artefact ne soit visible sur un aplat dégradé. */
const WEBP_QUALITY = 0.92

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
 * Rend une file d'attente séquentiellement et empaquette le résultat.
 *
 * Le rendu reste dans le thread principal, mais rend la main entre chaque item
 * (`yieldToBrowser`) pour que l'UI ne gèle pas : 18 fichiers en 3× bloqueraient
 * plusieurs secondes d'affilée. `shouldCancel` est consulté avant chaque item.
 *
 * ponytail: un Worker + `OffscreenCanvas` supprimerait complètement les à-coups.
 * Il faudrait y transférer les images décodées et y porter `renderScene` ;
 * à faire si la file dépasse la centaine d'items.
 */
export async function runBatch(
  jobs: readonly BatchJob[],
  options: {
    shouldCancel?: () => boolean
    onProgress?: (progress: BatchProgress) => void
    onItem?: (shotId: string, blob: Blob) => void
  } = {},
): Promise<Blob> {
  const entries: ZipEntry[] = []

  for (const [index, job] of jobs.entries()) {
    if (options.shouldCancel?.()) break

    options.onProgress?.({ index, total: jobs.length, shotId: job.shotId, name: job.name })
    await yieldToBrowser()

    const blob = await renderToBlob(job.scene, job.scale)
    const filename = batchFilename(job.name, job.ratio, job.scale, job.scene.settings.format)
    entries.push({ name: filename, data: new Uint8Array(await blob.arrayBuffer()) })
    options.onItem?.(job.shotId, blob)
  }

  return makeZip(entries)
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 60 })
    else setTimeout(resolve, 0)
  })
}
