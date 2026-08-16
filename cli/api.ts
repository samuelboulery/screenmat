/**
 * Le cœur headless : `render()` et `inspect()`. Le CLI, le serveur MCP et un
 * script de dev appellent tous les trois ces deux fonctions — aucune des trois
 * façades ne contient de logique.
 *
 * `dom-shim.ts` s'importe en premier : il installe les globales Canvas dont
 * `src/lib/` dépend, et doit être en place avant que quoi que ce soit de
 * `src/lib/` ne soit chargé.
 */
import { supportsWebp } from './dom-shim.ts'
import { createCanvas, loadImage, type Image } from '@napi-rs/canvas'
import { readFile } from 'node:fs/promises'
import { resolveStyle } from './styles-dir.ts'
import { BASE_WIDTH, computeGeometry, renderScene, type Geometry } from '../src/lib/render.ts'
import { screenRect } from '../src/lib/frame.ts'
import { extractPalette } from '../src/lib/palette.ts'
import { isImageSource, parseScene, type ImageSource, type SceneSpec } from '../src/lib/spec.ts'
import type { FractionRect, Format, Palette, Scene, Settings, Shot } from '../src/types.ts'

/** Forme courte : une image, des réglages, rien d'autre. C'est l'usage « outil
 *  de dev, sans annotations » — du sucre au-dessus du même chemin. */
export type SimpleSpec = {
  input: ImageSource
  settings?: Partial<Settings>
  style?: string
  scale?: number
}

export type RenderResult = {
  buffer: Buffer
  width: number
  height: number
  format: Format
  settings: Settings
}

export type InspectResult = {
  imageWidth: number
  imageHeight: number
  /** Où le screenshot atterrit dans sa fenêtre, en fractions de la largeur de
   *  celle-ci — le repère dans lequel les calques se placent. Sans ça, une
   *  annotation calculée depuis les pixels de l'image se retrouve décalée de la
   *  hauteur de la barre de titre. */
  screen: FractionRect
  /** Hauteur de la barre de titre, même unité. 0 si elle est masquée. */
  titleBar: number
  canvas: { width: number; height: number }
}

/**
 * L'`Image` de napi n'est pas un `HTMLImageElement` au sens de TypeScript, mais
 * l'est structurellement pour Canvas 2D : elle expose `naturalWidth`,
 * `naturalHeight`, et `drawImage` l'accepte. C'est la seule frontière du
 * projet où ce cast est nécessaire — il ne doit pas se propager.
 */
function asElement(image: Image): HTMLImageElement {
  return image as unknown as HTMLImageElement
}

async function decode(source: ImageSource): Promise<Image> {
  const where = typeof source === 'string' ? source : 'le buffer fourni'
  let data: Uint8Array
  try {
    data = typeof source === 'string' ? await readFile(source) : source
  } catch (error) {
    throw new Error(`Impossible de lire ${where} : ${message(error)}`)
  }

  try {
    return await loadImage(data)
  } catch (error) {
    throw new Error(`Impossible de décoder ${where} : ${message(error)}`)
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const isSimple = (spec: SceneSpec | SimpleSpec | unknown): spec is SimpleSpec =>
  typeof spec === 'object' && spec !== null && isImageSource((spec as SimpleSpec).input)

/** Normalise les deux formes d'entrée en une scène validée. La forme courte
 *  passe par `parseScene` elle aussi : un seul validateur, pas deux. */
async function toSpec(spec: SceneSpec | SimpleSpec | unknown): Promise<SceneSpec> {
  const raw = isSimple(spec)
    ? { style: spec.style, settings: spec.settings, scale: spec.scale, shots: [{ input: spec.input }] }
    : spec

  const parsed = parseScene(raw)
  if (!parsed.style) return parsed

  // Un style nommé fournit le socle ; les `settings` explicites le recouvrent.
  const style = await resolveStyle(parsed.style)
  const explicit = isRecordLike(raw) && isRecordLike(raw.settings) ? raw.settings : {}
  return {
    ...parsed,
    settings: { ...style.settings, ...pickSettings(parsed.settings, explicit) },
    palette: parsed.palette ?? style.palette,
  }
}

const isRecordLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Ne retient de `settings` que les clés réellement fournies par l'appelant :
 *  `parseScene` a rempli tout le reste avec les défauts, qui écraseraient
 *  sinon le style. */
function pickSettings(parsed: Settings, explicit: Record<string, unknown>): Partial<Settings> {
  const kept: Partial<Settings> = {}
  for (const key of Object.keys(explicit) as (keyof Settings)[]) {
    if (key in parsed) Object.assign(kept, { [key]: parsed[key] })
  }
  return kept
}

async function buildScene(spec: SceneSpec): Promise<Scene> {
  // Les décodages sont indépendants : les enchaîner faisait attendre le
  // vingt-quatrième shot derrière les vingt-trois autres.
  const images = await Promise.all(spec.shots.map((shot) => decode(shot.input)))

  const shots: Shot[] = spec.shots.map((shot, index) => {
    const image = asElement(images[index]!)
    return {
      id: `shot-${index + 1}`,
      name: shot.name,
      image,
      palette: spec.palette ?? extractPalette(image),
      layers: shot.layers,
    }
  })

  const palette: Palette = spec.palette ?? shots[0]!.palette

  const scene: Scene = { shots, palette, settings: spec.settings, composition: spec.composition }

  if (spec.settings.background === 'image') {
    if (!spec.background) {
      throw new Error('`background: "image"` demande un champ `background` pointant une image')
    }
    scene.backgroundImage = asElement(await decode(spec.background))
  }

  if (spec.watermark) {
    const { path, ...mark } = spec.watermark
    const image = await decode(path)
    scene.watermark = {
      image: asElement(image),
      // `dataUrl` n'est lu que par l'app web pour repersister le filigrane ;
      // le rendu ne se sert que de l'image déjà décodée.
      mark: { ...mark, dataUrl: '' },
    }
  }

  return scene
}

export async function render(input: SceneSpec | SimpleSpec | unknown): Promise<RenderResult> {
  const spec = await toSpec(input)
  // Le format par défaut est WebP. Là où l'encodeur manque, on retombe sur le
  // PNG et on le dit — `format` et `settings` renvoyés portent le vrai format,
  // et le nom de fichier en découle. Jeter ferait échouer le chemin nominal
  // pour une capacité de build, et livrer un PNG nommé `.webp` mentirait.
  const format: Format = spec.settings.format === 'webp' && !supportsWebp ? 'png' : spec.settings.format
  const settings: Settings = { ...spec.settings, format }

  const scene = await buildScene({ ...spec, settings })
  const canvas = createCanvas(1, 1)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponible')

  // renderScene dimensionne lui-même le canvas : c'est le même appel qu'en
  // preview et à l'export web, à l'échelle près.
  const geometry = renderScene(context as unknown as CanvasRenderingContext2D, scene, spec.scale)

  // WebP : même qualité que l'export web (`export.ts`), pour que les deux
  // chemins produisent le même poids de fichier.
  const buffer = format === 'webp' ? await canvas.encode('webp', 92) : await canvas.encode('png')

  return {
    buffer,
    width: geometry.width,
    height: geometry.height,
    format,
    settings,
  }
}

/**
 * Dit où le screenshot atterrit dans sa fenêtre. C'est ce qui rend les
 * annotations plaçables : un appelant qui a lu l'image en pixels convertit une
 * position en fraction de la largeur de fenêtre, barre de titre comprise.
 */
export async function inspect(
  input: ImageSource,
  settings?: Partial<Settings>,
): Promise<InspectResult> {
  const spec = await toSpec({ input, settings })
  const image = await decode(input)
  const geometry: Geometry = computeGeometry(
    image.naturalWidth,
    image.naturalHeight,
    spec.settings,
    1,
    spec.composition,
    1,
  )

  const { window } = geometry
  // Même source que le cadre et que le floutage : le bezel d'un macbook ou d'un
  // iphone compte, et le recalculer ici l'avait fait oublier.
  const screen = screenRect(window, geometry, spec.settings)

  return {
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    // Origine au coin haut-gauche de la fenêtre, unité = sa largeur.
    screen: {
      x: (screen.x - window.x) / window.width,
      y: (screen.y - window.y) / window.width,
      w: screen.width / window.width,
      h: screen.height / window.width,
    },
    titleBar: geometry.titleBar / window.width,
    canvas: { width: geometry.width, height: geometry.height },
  }
}

export { BASE_WIDTH, supportsWebp }
