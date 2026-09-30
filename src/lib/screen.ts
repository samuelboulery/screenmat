import type { Point, Rect } from './annotate.ts'
import type { Geometry, WindowBox } from './render.ts'
import { DEFAULT_PAN, type FrameStyle, type Pan, type Settings } from '../types.ts'

/* Où le screenshot atterrit : le rapport de sa fenêtre, le rectangle de son
   écran dedans, et la part de l'image qu'on y voit. Le dessin des cadres vit
   dans `frame.ts` ; ici, rien qui touche à un contexte canvas. */

/** Hauteur de la barre de titre, en fraction de la largeur de la fenêtre.
 *  Mesuré sur les captures de référence : 48 px pour une fenêtre de 1382 px. */
export const TITLE_BAR = 0.035

/* Cadres d'appareil — fractions de l'unité du cadre (`frameUnit`). */
const MACBOOK_BEZEL = 0.011
const MACBOOK_RADIUS = 0.014
const IPHONE_BEZEL = 0.035
const IPHONE_RADIUS = 0.13

/** Ratios d'écran d'un cadre `browser` ou `none`. Source unique : le type, le
 *  parseur, le schéma MCP, l'aide du CLI et l'inspecteur lisent cette liste. */
export const SCREEN_RATIOS = ['auto', '16:10', '16:9', '4:3', '1:1'] as const

export type ScreenRatio = (typeof SCREEN_RATIOS)[number]

/** Rapport hauteur/largeur de chaque ratio. */
const SCREEN_ASPECT: Record<Exclude<ScreenRatio, 'auto'>, number> = {
  '16:10': 10 / 16,
  '16:9': 9 / 16,
  '4:3': 3 / 4,
  '1:1': 1,
}

/** Écran d'un MacBook, et d'un iPhone tenu debout. */
const MACBOOK_ASPECT = 10 / 16
const IPHONE_ASPECT = 19.5 / 9

/** Libellé du ratio qu'impose « Device ratio », pour l'inspecteur. */
export const DEVICE_RATIO_LABEL = { macbook: '16:10', iphone: '19.5:9' } as const

function isDevice(frame: FrameStyle): frame is 'macbook' | 'iphone' {
  return frame === 'macbook' || frame === 'iphone'
}

/** Barre de titre d'une fenêtre, en fraction de sa largeur. */
export function titleBarOf(settings: Settings): number {
  return settings.titleBar && settings.frame === 'browser' ? TITLE_BAR : 0
}

/** Rapport hauteur/largeur voulu pour l'écran. En Auto, celui du screenshot. */
function screenAspect(imageWidth: number, imageHeight: number, settings: Settings): number {
  const natural = imageHeight / imageWidth
  if (settings.frame === 'macbook') return settings.deviceRatio ? MACBOOK_ASPECT : natural
  if (settings.frame === 'iphone') {
    if (!settings.deviceRatio) return natural
    // Un screenshot paysage couche le téléphone.
    return imageWidth > imageHeight ? 1 / IPHONE_ASPECT : IPHONE_ASPECT
  }
  return settings.screenRatio === 'auto' ? natural : SCREEN_ASPECT[settings.screenRatio]
}

/**
 * Rapport hauteur/largeur d'une fenêtre : celui de son écran, plus ce que le
 * cadre ajoute autour. Le bezel compte — sans lui la fenêtre prenait le rapport
 * de l'image, l'écran perdait deux bezels, et le screenshot sortait étiré.
 *
 * Un iPhone couché mesure son bezel sur sa hauteur, qui dépend du rapport qu'on
 * cherche : avec `s` le rapport de l'écran, `A = s / (1 − 2β(1 − s))`.
 */
export function windowAspect(imageWidth: number, imageHeight: number, settings: Settings): number {
  const s = screenAspect(imageWidth, imageHeight, settings)
  if (!isDevice(settings.frame)) return s + titleBarOf(settings)

  const bezel = settings.frame === 'macbook' ? MACBOOK_BEZEL : IPHONE_BEZEL
  const lying = settings.frame === 'iphone' && s < 1
  return lying ? s / (1 - 2 * bezel * (1 - s)) : s * (1 - 2 * bezel) + 2 * bezel
}

/** Longueur dont les cotes d'un cadre sont des fractions : le petit côté pour
 *  un iPhone — couché, il garde son bezel et son rayon —, la largeur sinon. */
export function frameUnit(box: WindowBox, frame: FrameStyle): number {
  return frame === 'iphone' ? Math.min(box.width, box.height) : box.width
}

/** Épaisseur du bezel d'un cadre d'appareil, en pixels. */
export function frameBezel(box: WindowBox, frame: 'macbook' | 'iphone'): number {
  return (frame === 'macbook' ? MACBOOK_BEZEL : IPHONE_BEZEL) * frameUnit(box, frame)
}

/** Rectangle occupé par le screenshot dans sa fenêtre, en pixels du canvas et
 *  dans le repère non tourné de la fenêtre. */
export type ScreenRect = { x: number; y: number; width: number; height: number }

/**
 * Où le screenshot atterrit dans sa fenêtre. Source unique : le cadre le
 * dessine ici, le floutage y échantillonne, et `inspect()` le publie aux
 * machines. Recalculer ce rectangle ailleurs, c'est le voir diverger — c'est
 * exactement ce qui faisait ignorer le bezel à `inspect()`.
 */
export function screenRect(box: WindowBox, geometry: Geometry, settings: Settings): ScreenRect {
  if (isDevice(settings.frame)) {
    const bezel = frameBezel(box, settings.frame)
    return {
      x: box.x + bezel,
      y: box.y + bezel,
      width: Math.max(1, box.width - 2 * bezel),
      height: Math.max(1, box.height - 2 * bezel),
    }
  }

  // `geometry.titleBar` vaut déjà 0 hors du cadre navigateur ou barre masquée,
  // et il est donné pour une fenêtre à l'échelle 1 : une fenêtre retouchée
  // porte son facteur, sinon elle garderait une barre pleine taille.
  const bar = geometry.titleBar * box.scale
  return {
    x: box.x,
    y: box.y + bar,
    width: box.width,
    height: Math.max(1, box.height - bar),
  }
}

/** Rayon effectif d'une fenêtre : les cadres d'appareil imposent le leur. */
export function frameRadius(box: WindowBox, geometry: Geometry, settings: Settings): number {
  if (settings.frame === 'macbook') return MACBOOK_RADIUS * frameUnit(box, 'macbook')
  if (settings.frame === 'iphone') return IPHONE_RADIUS * frameUnit(box, 'iphone')
  return geometry.radius * box.scale
}

type ImageSize = { naturalWidth: number; naturalHeight: number }

/**
 * La part du screenshot visible dans son écran, en pixels de l'image. Toujours
 * « cover » : une seule échelle sur les deux axes, l'axe qui déborde est rogné,
 * et `pan` dit quelle part du débord part avant (0), après (1) ou des deux
 * côtés (0,5). Quand l'image a le rapport de l'écran, c'est l'image entière.
 *
 * Source unique, avec `screenRect` : le cadre dessine ce rectangle, le floutage
 * y échantillonne, `inspect()` le publie. Un floutage qui relirait autre chose
 * cacherait autre chose que ce qu'on voit.
 */
export function sourceRect(screen: ScreenRect, image: ImageSize, pan: Pan = DEFAULT_PAN): Rect {
  const scale = Math.max(screen.width / image.naturalWidth, screen.height / image.naturalHeight)
  const w = Math.min(image.naturalWidth, screen.width / scale)
  const h = Math.min(image.naturalHeight, screen.height / scale)
  return {
    x: (image.naturalWidth - w) * pan.x,
    y: (image.naturalHeight - h) * pan.y,
    w,
    h,
  }
}

/** De combien le screenshot glisse dans son écran quand `pan` passe de 0 à 1,
 *  par axe et en largeurs de fenêtre — le repère des calques. Nul sur un axe
 *  qui ne déborde pas : sous un demi-pixel, c'est l'arrondi d'un rapport égal,
 *  et `panTo` diviserait le geste par ce presque-rien. */
export function panTravel(box: WindowBox, screen: ScreenRect, image: ImageSize): Point {
  const scale = Math.max(screen.width / image.naturalWidth, screen.height / image.naturalHeight)
  const overflow = (shown: number, room: number) => (shown - room < 0.5 ? 0 : (shown - room) / box.width)
  return {
    x: overflow(image.naturalWidth * scale, screen.width),
    y: overflow(image.naturalHeight * scale, screen.height),
  }
}

/** La position du screenshot après un glisser de `delta` (en largeurs de
 *  fenêtre) depuis `origin`. L'image suit la main : la tirer vers la droite
 *  découvre sa gauche, donc `pan` baisse. Bornée aux bords de l'image ; un axe
 *  qui ne déborde pas ne bouge pas. */
export function panTo(origin: Pan, delta: Point, travel: Point): Pan {
  const axis = (from: number, moved: number, room: number) =>
    room > 0 ? Math.min(1, Math.max(0, from - moved / room)) : from
  return { x: axis(origin.x, delta.x, travel.x), y: axis(origin.y, delta.y, travel.y) }
}
