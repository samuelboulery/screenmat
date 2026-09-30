/**
 * Les fonds des séries macOS et Windows : télécharge les originaux, les recadre
 * au centre en 16:10 et les écrit en WebP dans `public/wallpapers/`, avec une
 * vignette pour le sélecteur. Les originaux restent dans le dossier de cache,
 * hors dépôt.
 *
 *   node docs/assets/wallpapers.ts [dossier-de-cache] [préfixe]
 *
 * `préfixe` ne refait que les fonds dont l'identifiant commence ainsi
 * (`windows`, `tahoe`…) : inutile de retélécharger quinze images 6K pour en
 * ajouter une. Il vient en second : seul, il serait pris pour le dossier.
 *
 *   node docs/assets/wallpapers.ts /tmp/screenmat-wallpapers windows
 *
 * Sources : l'archive de 512 Pixels (images © Apple Inc.) et le Windows
 * Wallpaper Wiki (images © Microsoft Corporation).
 */
import { createCanvas, loadImage, type Canvas, type Image } from '@napi-rs/canvas'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { WALLPAPERS, wallpaperPath, type Wallpaper } from '../../src/lib/wallpapers.ts'

const APPLE = 'https://media.512pixels.net/downloads/macos-wallpapers-6k/'
const MICROSOFT = 'https://static.wikitide.net/windowswallpaperwiki/'

/** L'original de chaque fond. Le dernier segment de l'URL nomme sa copie en cache. */
const FILES: Record<Wallpaper, string> = {
  'golden-gate-light': `${APPLE}27-Golden-Gate.png`,
  'golden-gate-dark': `${APPLE}27-Golden-Gate-Dark.png`,
  'golden-gate-bridge': `${APPLE}27-Golden-Gate-Bridge.jpg`,
  'tahoe-light': `${APPLE}26-Tahoe-Light-6K.png`,
  'tahoe-dark': `${APPLE}26-Tahoe-Dark-6K.png`,
  'sequoia-light': `${APPLE}15-Sequoia-Light-6K.jpg`,
  'sequoia-dark': `${APPLE}15-Sequoia-Dark-6K.jpg`,
  'sonoma-light': `${APPLE}14-Sonoma-Light.jpg`,
  'sonoma-dark': `${APPLE}14-Sonoma-Dark.jpg`,
  'ventura-light': `${APPLE}13-Ventura-Light.jpg`,
  'ventura-dark': `${APPLE}13-Ventura-Dark.jpg`,
  'monterey-light': `${APPLE}12-Monterey-Light.jpg`,
  'monterey-dark': `${APPLE}12-Monterey-Dark.jpg`,
  'big-sur-day': `${APPLE}11-Big-Sur-Color-Day-6k.jpg`,
  'big-sur-night': `${APPLE}11-Big-Sur-Color-Night-6k.jpg`,
  'windows-11-light': `${MICROSOFT}5/57/Img0_%28Windows_11%29.jpg`,
  'windows-11-dark': `${MICROSOFT}f/f3/Img19_%28Windows_11%29.jpg`,
  'windows-10': `${MICROSOFT}4/44/Img0_%28Windows_10%29.jpg`,
  'windows-8': `${MICROSOFT}7/7b/Img0_%28Windows_8%29.jpg`,
  'windows-7': `${MICROSOFT}5/50/Img0_%28Windows_7%29.jpg`,
  'windows-xp': `${MICROSOFT}c/cf/Bliss.jpg`,
}

// ponytail: 3840 px pour un canvas de 4800 px à l'échelle 3 — agrandi ×1,25,
// invisible sur ces images sans détail fin. Un ratio portrait agrandit
// davantage : monter FULL si un export 9:16 en 3× montre du flou.
// Un plafond, pas une cible : Windows 10, 8 et 7 n'existent qu'en 1920 px, XP en
// 800. Les agrandir ici ne leur rendrait aucun détail et pèserait quatre fois
// plus — le moteur agrandit au dessin (`drawCover`).
const FULL = { width: 3840, height: 2400 }
const THUMB = { width: 192, height: 120 }
/** Plafond par fichier, tenu par `cli/__tests__/render.test.ts`. */
const BUDGET = 600 * 1024

const root = path.resolve(import.meta.dirname, '../..')
const cache = path.resolve(process.argv[2] ?? path.join(tmpdir(), 'screenmat-wallpapers'))
const only = process.argv[3] ?? ''

async function original(url: string): Promise<Buffer> {
  const file = decodeURIComponent(path.basename(new URL(url).pathname))
  const local = path.join(cache, file)
  try {
    return await readFile(local)
  } catch (error) {
    // Pas encore en cache : on télécharge. Toute autre erreur se dit.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`)
  // Une page d'erreur servie en 200 ne doit pas entrer dans le cache.
  const type = response.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) throw new Error(`${file}: réponse « ${type} », pas une image`)
  const data = Buffer.from(await response.arrayBuffer())
  await writeFile(local, data)
  return data
}

/** Recadrage centré, comme `drawCover` côté moteur. */
function cover(image: Image, size: { width: number; height: number }): Canvas {
  const canvas = createCanvas(size.width, size.height)
  const ctx = canvas.getContext('2d')
  const scale = Math.max(size.width / image.width, size.height / image.height)
  const w = image.width * scale
  const h = image.height * scale
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, (size.width - w) / 2, (size.height - h) / 2, w, h)
  return canvas
}

/** Le plus grand 16:10 que l'original remplit sans agrandissement, `FULL` au plus. */
function fullSize(image: Image): { width: number; height: number } {
  const width = Math.round(Math.min(FULL.width, image.width, (image.height * FULL.width) / FULL.height))
  return { width, height: Math.round((width * FULL.height) / FULL.width) }
}

/** La meilleure qualité qui tient dans le budget. */
function encode(canvas: Canvas): Buffer {
  for (const quality of [86, 80, 74, 68, 60, 50]) {
    const data = canvas.toBuffer('image/webp', quality)
    if (data.length <= BUDGET) return data
  }
  throw new Error('Image trop lourde même à la qualité 50')
}

await mkdir(cache, { recursive: true })
await mkdir(path.join(root, 'public/wallpapers/thumbs'), { recursive: true })

for (const kind of WALLPAPERS.filter((item) => item.startsWith(only))) {
  const image = await loadImage(await original(FILES[kind]))
  const size = fullSize(image)
  const full = encode(cover(image, size))
  const thumb = cover(image, THUMB).toBuffer('image/webp', 70)
  await writeFile(path.join(root, 'public', wallpaperPath(kind, 'full')), full)
  await writeFile(path.join(root, 'public', wallpaperPath(kind, 'thumb')), thumb)
  process.stdout.write(`${kind}  ${size.width}×${size.height}  ${Math.round(full.length / 1024)} Ko  vignette ${Math.round(thumb.length / 1024)} Ko\n`)
}
