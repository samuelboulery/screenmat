import { m } from './i18n/index.ts'
import { wallpaperPath, type Wallpaper } from './wallpapers.ts'

/** Types acceptés à l'import. Le presse-papier de macOS produit du PNG, les
 *  captures partagées arrivent souvent en JPEG ou WebP. */
const ACCEPTED = /^image\/(png|jpeg|webp|gif|avif)$/

/** Le watermark accepte en plus le SVG : c'est un logo, pas un screenshot. */
const ACCEPTED_MARK = /^image\/(png|jpeg|webp|svg\+xml)$/

export function isSupportedImage(blob: Blob): boolean {
  return ACCEPTED.test(blob.type)
}

export function isSupportedMark(blob: Blob): boolean {
  return ACCEPTED_MARK.test(blob.type)
}

/**
 * Charge un blob en HTMLImageElement. L'URL objet n'est révoquée que dans le
 * chemin d'erreur : les vignettes de l'interface réutilisent `image.src`, et la
 * révoquer casserait leur affichage.
 */
export function loadImage(blob: Blob): Promise<HTMLImageElement> {
  if (!isSupportedImage(blob) && !isSupportedMark(blob)) {
    return Promise.reject(new Error(m.messages.image.unsupportedFormat(blob.type)))
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()

    image.onload = () => {
      if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        URL.revokeObjectURL(url)
        reject(new Error(m.messages.image.empty))
        return
      }
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(m.messages.image.decodeFailed))
    }

    image.src = url
  })
}

/** Un décodage par fichier : la tuile, la preview et l'export d'un même fond
 *  macOS attendent la même promesse. */
const wallpapers = new Map<string, Promise<HTMLImageElement>>()
/** Ceux qui sont arrivés, lisibles sans attendre : revenir à un fond déjà vu ne
 *  doit pas repasser par l'aplat le temps d'une promesse. */
const decoded = new Map<string, HTMLImageElement>()

export function loadedWallpaper(kind: Wallpaper, size: 'full' | 'thumb'): HTMLImageElement | undefined {
  return decoded.get(`/${wallpaperPath(kind, size)}`)
}

/**
 * Charge un fond macOS embarqué (`public/wallpapers/`). Même origine, comme les
 * polices : aucune donnée ne sort. Un échec — hors ligne, fichier jamais vu —
 * sort du cache, pour qu'un nouvel essai puisse réussir.
 */
export function loadWallpaper(kind: Wallpaper, size: 'full' | 'thumb'): Promise<HTMLImageElement> {
  const url = `/${wallpaperPath(kind, size)}`
  const known = wallpapers.get(url)
  if (known) return known

  const loading = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      decoded.set(url, image)
      resolve(image)
    }
    image.onerror = () => {
      wallpapers.delete(url)
      // ponytail: pas de nouvel essai automatique — il faut changer de fond puis
      // y revenir. Écouter `online` si le cas hors ligne devient courant.
      reject(new Error(m.messages.image.wallpaperFailed(kind)))
    }
    image.src = url
  })
  wallpapers.set(url, loading)
  return loading
}

/** Charge une dataURL (watermark stocké dans un style). */
export function loadDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(m.messages.image.watermarkUnreadable))
    image.src = dataUrl
  })
}

export function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(m.messages.image.readFailed))
    reader.readAsDataURL(blob)
  })
}

/** Vignette JPEG légère pour l'historique : la grille en affiche des dizaines,
 *  il ne faut surtout pas y charger le rendu plein format. 240 px couvre la
 *  tuile de 208 px de la grille, y compris sur un écran dense. */
export function makeThumbnail(source: CanvasImageSource, width = 240): string {
  const canvas = document.createElement('canvas')
  const ratio = sourceHeight(source) / sourceWidth(source)
  canvas.width = width
  canvas.height = Math.max(1, Math.round(width * ratio))

  const context = canvas.getContext('2d')
  if (!context) return ''

  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

function sourceWidth(source: CanvasImageSource): number {
  if (source instanceof HTMLImageElement) return source.naturalWidth
  if (source instanceof HTMLCanvasElement) return source.width
  return 1
}

function sourceHeight(source: CanvasImageSource): number {
  if (source instanceof HTMLImageElement) return source.naturalHeight
  if (source instanceof HTMLCanvasElement) return source.height
  return 1
}

/** Tous les fichiers image d'un DataTransfer (drop ou paste). */
export function pickImages(items: DataTransferItemList | FileList | null): File[] {
  if (!items) return []

  const files: File[] = []
  for (const item of Array.from(items as ArrayLike<DataTransferItem | File>)) {
    const file = item instanceof File ? item : item.getAsFile()
    if (file && isSupportedImage(file)) files.push(file)
  }
  return files
}

/** Premier fichier image seulement — pour le watermark et le fond. */
export function pickImage(items: DataTransferItemList | FileList | null): File | null {
  return pickImages(items)[0] ?? null
}
