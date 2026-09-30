import { normalizeRect, toPixels, type Rect } from './annotate.ts'
import { windowPath, windowTransform } from './frame.ts'
import { frameRadius, screenRect, sourceRect, type ScreenRect } from './screen.ts'
import type { Geometry, WindowBox } from './render.ts'
import type { Annotation, Pan, Settings } from '../types.ts'

/* Le floutage. À part des autres calques (`layers.ts`) : lui ne dessine pas
   par-dessus le screenshot, il en remplace les pixels. */

/** Nombre de blocs sur la largeur d'une zone floutée. Constant, donc le flou est
 *  visuellement identique à l'échelle 1 et à l'échelle 3. */
const REDACTION_BLOCKS = 14
const PIXEL_BLOCKS = 8

/** Aplat des zones masquées, et de ce qui déborde du screenshot. */
const REDACTED = '#0B0B0F'

/**
 * Cuit les zones floutées dans les pixels, sous le clip de la fenêtre. Jamais en
 * CSS : sinon l'export ne correspondrait plus à la preview et, pire, la donnée
 * masquée resterait lisible dans le fichier.
 *
 * L'échantillon vient du **screenshot source**, jamais de `ctx.canvas` : relire
 * le canvas de destination force le rasteriseur à vider toute la frame en cours,
 * puis à en rasteriser la suite une seconde fois — une frame passait de 3 ms à
 * 372 ms dès qu'une seule zone existait. Y échantillonner permet en prime de
 * dessiner sous `windowTransform`, donc de suivre la rotation de la fenêtre.
 */
export function renderRedactions(
  ctx: CanvasRenderingContext2D,
  box: WindowBox,
  geometry: Geometry,
  image: HTMLImageElement,
  annotations: readonly Annotation[],
  settings: Settings,
  pan?: Pan,
): void {
  const zones = annotations.filter((annotation) => annotation.kind === 'redaction')
  if (zones.length === 0) return

  const screen = screenRect(box, geometry, settings)
  const visible = sourceRect(screen, image, pan)

  ctx.save()
  windowTransform(ctx, box)
  windowPath(ctx, box, frameRadius(box, geometry, settings))
  ctx.clip()

  for (const zone of zones) {
    const drawn = normalizeRect(toPixels(zone.rect, box))
    if (drawn.w < 1 || drawn.h < 1) continue
    // Fenêtre de face : la zone se cale sur les pixels. Un bord à cheval en
    // mêlerait deux — l'image et son flou —, et se lirait comme un contour.
    const rect = box.rotateY === 0 ? snap(drawn) : drawn

    ctx.save()
    if (zone.redactionShape === 'ellipse') {
      ctx.beginPath()
      ctx.ellipse(drawn.x + drawn.w / 2, drawn.y + drawn.h / 2, drawn.w / 2, drawn.h / 2, 0, 0, Math.PI * 2)
      ctx.clip()
    }

    const inside = zone.redaction === 'solid' ? null : intersect(rect, screen)

    // Hors du screenshot — barre de titre, bezel — il n'y a rien à
    // échantillonner : cette part se couvre de l'aplat, comme le mode `solid`.
    // Seulement si la zone déborde vraiment : posé sous un flou qui couvre tout,
    // l'aplat ressortait en filet sombre sur le bord.
    if (!inside || overflows(drawn, screen)) {
      ctx.fillStyle = REDACTED
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    }

    if (inside) {
      // Le bord du screenshot tombe rarement sur un pixel entier : le flou s'y
      // pose élargi, sinon ce pixel garderait une part de l'original.
      const target = box.rotateY === 0 ? snap(inside) : inside
      const blocks = zone.redaction === 'pixel' ? PIXEL_BLOCKS : REDACTION_BLOCKS
      downsample(ctx, image, screen, visible, inside, target, blocks)
    }
    ctx.restore()
  }

  ctx.restore()
}

/** Le rectangle élargi aux pixels entiers qu'il touche. */
function snap(rect: Rect): Rect {
  const x = Math.floor(rect.x)
  const y = Math.floor(rect.y)
  return { x, y, w: Math.ceil(rect.x + rect.w) - x, h: Math.ceil(rect.y + rect.h) - y }
}

/** Vrai si `rect` sort du screenshot de plus d'un demi-pixel. En deçà, c'est
 *  l'arrondi d'une zone posée au bord — comparer des flottants à l'égalité
 *  prenait deux zones sur trois pour un débord. */
function overflows(rect: Rect, screen: ScreenRect): boolean {
  const slack = 0.5
  return (
    rect.x < screen.x - slack ||
    rect.y < screen.y - slack ||
    rect.x + rect.w > screen.x + screen.width + slack ||
    rect.y + rect.h > screen.y + screen.height + slack
  )
}

/** Part de `rect` qui tombe dans le screenshot, `null` si elle est vide. */
function intersect(rect: Rect, screen: ScreenRect): Rect | null {
  const x = Math.max(rect.x, screen.x)
  const y = Math.max(rect.y, screen.y)
  const right = Math.min(rect.x + rect.w, screen.x + screen.width)
  const bottom = Math.min(rect.y + rect.h, screen.y + screen.height)
  if (right - x < 1 || bottom - y < 1) return null
  return { x, y, w: right - x, h: bottom - y }
}

/** Réduit puis réagrandit la zone : flou (lissé) ou mosaïque (non lissé).
 *  `rect` est la part échantillonnée, `target` celle où elle se pose. */
function downsample(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  screen: ScreenRect,
  visible: Rect,
  rect: Rect,
  target: Rect,
  blocks: number,
): void {
  // `visible` est la part du screenshot posée dans `screen`, à une seule
  // échelle : la zone s'y relit en proportion, recadrage compris.
  const k = visible.w / screen.width
  const source = {
    x: visible.x + (rect.x - screen.x) * k,
    y: visible.y + (rect.y - screen.y) * k,
    w: rect.w * k,
    h: rect.h * k,
  }
  // Rien à échantillonner, ou pas de toile pour le faire : l'aplat. Sortir sans
  // rien poser laisserait lisible ce que la zone devait masquer.
  const cover = () => {
    ctx.fillStyle = REDACTED
    ctx.fillRect(target.x, target.y, target.w, target.h)
  }
  if (source.w < 1 || source.h < 1) return cover()

  const small = document.createElement('canvas')
  small.width = Math.max(1, Math.round(blocks))
  small.height = Math.max(1, Math.round((blocks * rect.h) / rect.w))

  const layer = small.getContext('2d')
  if (!layer) return cover()

  layer.imageSmoothingEnabled = blocks > PIXEL_BLOCKS
  layer.drawImage(image, source.x, source.y, source.w, source.h, 0, 0, small.width, small.height)

  ctx.save()
  ctx.imageSmoothingEnabled = blocks > PIXEL_BLOCKS
  ctx.drawImage(small, 0, 0, small.width, small.height, target.x, target.y, target.w, target.h)
  ctx.restore()
}
