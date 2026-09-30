import type { Point } from './annotate.ts'
import { css, hexToRgb, luminance, withLuminance, type Rgb } from './color.ts'
import type { Geometry, WindowBox } from './render.ts'
import { frameBezel, frameRadius, frameUnit, screenRect, sourceRect, type ScreenRect } from './screen.ts'
import type { IslandSide, Palette, Pan, Settings } from '../types.ts'

/* Toutes ces constantes sont des fractions de la LARGEUR DE LA FENÊTRE, mesurées
   sur les captures de référence (fenêtre de 1382 px dans un canvas de 1600). */
const BAR_INSET = 0.0152
const DOT_RADIUS = 0.0036
const DOT_GAP = 0.0145
const MENU_DOT_RADIUS = 0.0018
const MENU_DOT_GAP = 0.006
const PILL_WIDTH = 0.286
const PILL_HEIGHT = 0.0174
const URL_FONT = 0.0098

/* Fractions de la largeur du CANVAS. */
const SHADOW_BLUR = 0.04
const SHADOW_OFFSET = 0.015
const SHADOW_ALPHA = 0.35

/* Encoches — fractions de l'unité du cadre (`frameUnit`, `screen.ts`). */
const MACBOOK_NOTCH_WIDTH = 0.12
const MACBOOK_NOTCH_HEIGHT = 0.016
const IPHONE_ISLAND_WIDTH = 0.3
const IPHONE_ISLAND_HEIGHT = 0.055

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

/** Au-dessus, le screenshot est clair et appelle un chrome clair. */
const LIGHT_THRESHOLD = 0.5

type Chrome = { bar: Rgb; pill: Rgb; dot: Rgb; text: Rgb }

/**
 * Couleurs du chrome, dérivées du screenshot plutôt que figées : la barre de
 * miette est un blanc chaud, celle d'accessipote un blanc froid. Un gris neutre
 * unique trahirait l'image.
 */
export function chromeColors(palette: Palette, theme: Settings['theme']): Chrome {
  const base = hexToRgb(palette.base)
  const light = theme === 'auto' ? luminance(base) > LIGHT_THRESHOLD : theme === 'light'

  return light
    ? {
        bar: withLuminance(base, 0.93),
        pill: withLuminance(base, 1),
        dot: withLuminance(base, 0.78),
        text: withLuminance(base, 0.55),
      }
    : {
        bar: withLuminance(base, 0.075),
        pill: withLuminance(base, 0.045),
        dot: withLuminance(base, 0.22),
        text: withLuminance(base, 0.45),
      }
}

/** Cisaillement vertical simulant la rotation Y. `render.ts` l'importe pour
 *  calculer l'encombrement : la matrice et la place qu'elle réclame doivent
 *  parler du même cisaillement, et c'est l'import qui le garantit. */
export const SKEW = 0.3

/** Matrice affine 2D `[a, b, c, d, e, f]`, dans l'ordre de `ctx.transform`. */
export type Matrix = readonly [number, number, number, number, number, number]

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

/**
 * Rotation Y d'une fenêtre, sous forme de matrice. Approximation affine —
 * compression horizontale plus cisaillement vertical — plutôt qu'un vrai
 * mapping projectif : aux angles utilisés (±16°) l'illusion tient, et une
 * matrice reste homothétique à l'export, ce qu'un découpage en bandes ne
 * garantirait pas.
 *
 * Seule description de cette rotation : `windowTransform` l'applique au
 * contexte, la preview l'inverse pour retrouver le point sous le curseur.
 */
export function windowMatrix(box: WindowBox): Matrix {
  if (box.rotateY === 0) return IDENTITY

  const radians = (box.rotateY * Math.PI) / 180
  const cx = box.x + box.width / 2
  const a = Math.cos(radians)
  const b = Math.sin(radians) * SKEW

  // translate(cx, cy) · [a b 0 1 0 0] · translate(-cx, -cy)
  return [a, b, 0, 1, cx - a * cx, -b * cx]
}

export function applyMatrix(m: Matrix, point: Point): Point {
  return {
    x: m[0] * point.x + m[2] * point.y + m[4],
    y: m[1] * point.x + m[3] * point.y + m[5],
  }
}

/** Inverse d'une matrice affine. `det` ne s'annule pas : `a = cos(±16°)`. */
export function invertMatrix(m: Matrix): Matrix {
  const det = m[0] * m[3] - m[1] * m[2]
  if (Math.abs(det) < 1e-12) return IDENTITY

  return [
    m[3] / det,
    -m[1] / det,
    -m[2] / det,
    m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det,
    (m[1] * m[4] - m[0] * m[5]) / det,
  ]
}

/** Applique la rotation Y d'une fenêtre au contexte. */
export function windowTransform(ctx: CanvasRenderingContext2D, box: WindowBox): void {
  if (box.rotateY === 0) return
  const m = windowMatrix(box)
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5])
}

/** Chemin de la fenêtre. Exporté : la redaction en a besoin pour se clipper. */
export function windowPath(
  ctx: CanvasRenderingContext2D,
  box: WindowBox,
  radius: number,
): void {
  ctx.beginPath()
  ctx.roundRect(box.x, box.y, box.width, box.height, radius)
}

/**
 * Dessine la fenêtre : ombre portée, coins arrondis, screenshot clippé, puis le
 * chrome propre au style choisi. Appelée par `renderScene` après le fond, une
 * fois par fenêtre de la composition.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  box: WindowBox,
  geometry: Geometry,
  image: HTMLImageElement,
  palette: Palette,
  settings: Settings,
  pan?: Pan,
): void {
  const chrome = chromeColors(palette, settings.theme)
  const radius = frameRadius(box, geometry, settings)
  const shell = settings.frame === 'macbook' || settings.frame === 'iphone'

  if (settings.shadow > 0) {
    ctx.save()
    ctx.shadowColor = `rgba(0, 0, 0, ${Math.min(1, SHADOW_ALPHA * settings.shadow)})`
    ctx.shadowBlur = SHADOW_BLUR * geometry.width
    ctx.shadowOffsetY = SHADOW_OFFSET * geometry.width
    ctx.fillStyle = shell ? '#111114' : css(chrome.bar)
    windowPath(ctx, box, radius)
    ctx.fill()
    ctx.restore()
  }

  ctx.save()
  windowPath(ctx, box, radius)
  ctx.clip()

  const screen = screenRect(box, geometry, settings)

  if (settings.frame === 'macbook' || settings.frame === 'iphone') {
    drawDeviceShell(ctx, box, screen, radius, image, settings.frame, settings.islandSide, pan)
  } else {
    drawScreenshot(ctx, screen, image, pan)
    if (geometry.titleBar > 0) {
      drawTitleBar(ctx, box, geometry.titleBar * box.scale, chrome, settings.url)
    }
  }

  ctx.restore()
}

/** Le screenshot dans son écran : la part visible, à une seule échelle. Jamais
 *  étiré — un écran d'un autre rapport le rogne (`sourceRect`). */
function drawScreenshot(ctx: CanvasRenderingContext2D, screen: ScreenRect, image: HTMLImageElement, pan?: Pan): void {
  const source = sourceRect(screen, image, pan)
  ctx.drawImage(image, source.x, source.y, source.w, source.h, screen.x, screen.y, screen.width, screen.height)
}

/**
 * Cadre d'appareil : coque sombre, écran encastré, encoche. Volontairement
 * sobre — le sujet reste le screenshot, pas le matériel.
 */
function drawDeviceShell(
  ctx: CanvasRenderingContext2D,
  box: WindowBox,
  screen: ScreenRect,
  radius: number,
  image: HTMLImageElement,
  kind: 'macbook' | 'iphone',
  side: IslandSide,
  pan?: Pan,
): void {
  const bezel = frameBezel(box, kind)

  ctx.fillStyle = '#111114'
  ctx.fillRect(box.x, box.y, box.width, box.height)

  ctx.save()
  ctx.beginPath()
  // `max(0, …)` : un rayon négatif lève `RangeError` dans un navigateur.
  ctx.roundRect(screen.x, screen.y, screen.width, screen.height, Math.max(0, radius - bezel))
  ctx.clip()
  drawScreenshot(ctx, screen, image, pan)
  ctx.restore()

  ctx.fillStyle = '#0a0a0c'
  ctx.beginPath()
  if (kind === 'macbook') macbookNotch(ctx, box)
  else iphoneIsland(ctx, box, screen, bezel, side)
  ctx.fill()
}

/** Barre fine, collée au bord haut, coins bas arrondis. */
function macbookNotch(ctx: CanvasRenderingContext2D, box: WindowBox): void {
  const width = MACBOOK_NOTCH_WIDTH * box.width
  const height = MACBOOK_NOTCH_HEIGHT * box.width
  ctx.roundRect(box.x + (box.width - width) / 2, box.y, width, height, [0, 0, height / 2, height / 2])
}

/** Îlot arrondi, en haut d'un iPhone debout. Couché — screenshot paysage —, le
 *  téléphone a tourné d'un quart de tour : l'îlot passe sur un bord court,
 *  celui de `side` selon le sens de la rotation, et ses cotes se lisent sur le
 *  petit côté. */
function iphoneIsland(
  ctx: CanvasRenderingContext2D,
  box: WindowBox,
  screen: ScreenRect,
  bezel: number,
  side: IslandSide,
): void {
  const unit = frameUnit(box, 'iphone')
  const long = IPHONE_ISLAND_WIDTH * unit
  const short = IPHONE_ISLAND_HEIGHT * unit
  const inset = bezel * 0.4

  if (box.width > box.height) {
    const x = side === 'right' ? screen.x + screen.width - inset - short : screen.x + inset
    ctx.roundRect(x, box.y + (box.height - long) / 2, short, long, short / 2)
  } else {
    ctx.roundRect(box.x + (box.width - long) / 2, screen.y + inset, long, short, short / 2)
  }
}

function drawTitleBar(
  ctx: CanvasRenderingContext2D,
  box: WindowBox,
  bar: number,
  chrome: Chrome,
  url: string,
): void {
  const { x, y, width } = box
  const middle = y + bar / 2

  ctx.fillStyle = css(chrome.bar)
  ctx.fillRect(x, y, width, bar)

  // Trois pastilles à gauche — monochromes, comme sur toutes les références.
  ctx.fillStyle = css(chrome.dot)
  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath()
    ctx.arc(
      x + (BAR_INSET + DOT_RADIUS + index * DOT_GAP) * width,
      middle,
      DOT_RADIUS * width,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  // Trois points de menu à droite.
  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath()
    ctx.arc(
      x + width - (BAR_INSET + MENU_DOT_RADIUS + (2 - index) * MENU_DOT_GAP) * width,
      middle,
      MENU_DOT_RADIUS * width,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  drawUrlPill(ctx, box, bar, chrome, url)
}

function drawUrlPill(
  ctx: CanvasRenderingContext2D,
  box: WindowBox,
  bar: number,
  chrome: Chrome,
  url: string,
): void {
  const { x, y, width } = box
  const middle = y + bar / 2
  const pillWidth = PILL_WIDTH * width
  const pillHeight = PILL_HEIGHT * width

  ctx.fillStyle = css(chrome.pill)
  ctx.beginPath()
  ctx.roundRect(
    x + (width - pillWidth) / 2,
    middle - pillHeight / 2,
    pillWidth,
    pillHeight,
    pillHeight / 2,
  )
  ctx.fill()

  const label = url.trim()
  if (!label) return

  ctx.fillStyle = css(chrome.text)
  ctx.font = `${URL_FONT * width}px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + width / 2, middle, pillWidth * 0.86)
}
