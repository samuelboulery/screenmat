import { badgeNumbers, badgeRadius, normalizeRect, toLength, toPixels, type Rect } from './annotate.ts'
import { css, hexToRgb, inkOn } from './color.ts'
import { frameRadius, screenRect, windowPath, windowTransform, type ScreenRect } from './frame.ts'
import type { Geometry, WindowBox } from './render.ts'
import type { Annotation, LabelStyle, Settings } from '../types.ts'

/* Dessin des calques. Un seul chemin : la preview et l'export appellent les
   mêmes fonctions, avec la même `WindowBox` à des échelles différentes. */

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const STAGE = 'rgba(7, 7, 10, 0.78)'

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
): void {
  const zones = annotations.filter((annotation) => annotation.kind === 'redaction')
  if (zones.length === 0) return

  const screen = screenRect(box, geometry, settings)

  ctx.save()
  windowTransform(ctx, box)
  windowPath(ctx, box, frameRadius(box, geometry, settings))
  ctx.clip()

  for (const zone of zones) {
    const rect = normalizeRect(toPixels(zone.rect, box))
    if (rect.w < 1 || rect.h < 1) continue

    const inside = zone.redaction === 'solid' ? null : intersect(rect, screen)

    // Hors du screenshot — barre de titre, bezel — il n'y a rien à
    // échantillonner : cette part se couvre de l'aplat, comme le mode `solid`.
    if (!inside || inside.w !== rect.w || inside.h !== rect.h) {
      ctx.fillStyle = REDACTED
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    }

    if (inside) {
      downsample(
        ctx,
        image,
        screen,
        inside,
        zone.redaction === 'pixel' ? PIXEL_BLOCKS : REDACTION_BLOCKS,
      )
    }
  }

  ctx.restore()
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

/** Réduit puis réagrandit la zone : flou (lissé) ou mosaïque (non lissé). */
function downsample(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  screen: ScreenRect,
  rect: Rect,
  blocks: number,
): void {
  // Le screenshot est posé dans `screen` : la zone s'y relit en proportion.
  const scaleX = image.naturalWidth / screen.width
  const scaleY = image.naturalHeight / screen.height
  const source = {
    x: (rect.x - screen.x) * scaleX,
    y: (rect.y - screen.y) * scaleY,
    w: rect.w * scaleX,
    h: rect.h * scaleY,
  }
  if (source.w < 1 || source.h < 1) return

  const small = document.createElement('canvas')
  small.width = Math.max(1, Math.round(blocks))
  small.height = Math.max(1, Math.round((blocks * rect.h) / rect.w))

  const layer = small.getContext('2d')
  if (!layer) return

  layer.imageSmoothingEnabled = blocks > PIXEL_BLOCKS
  layer.drawImage(image, source.x, source.y, source.w, source.h, 0, 0, small.width, small.height)

  ctx.save()
  ctx.imageSmoothingEnabled = blocks > PIXEL_BLOCKS
  ctx.drawImage(small, 0, 0, small.width, small.height, rect.x, rect.y, rect.w, rect.h)
  ctx.restore()
}

/**
 * Dessine les calques non destructifs d'une fenêtre. Appelée par `renderScene`
 * une fois toutes les fenêtres posées : un calque passe toujours au-dessus.
 */
export function renderAnnotations(
  ctx: CanvasRenderingContext2D,
  box: WindowBox,
  annotations: readonly Annotation[],
  editing?: { id: string; caret: number; blink: boolean },
): void {
  const numbers = badgeNumbers(annotations)

  ctx.save()
  windowTransform(ctx, box)

  for (const annotation of annotations) {
    if (annotation.kind === 'redaction') continue

    ctx.save()
    ctx.globalAlpha = annotation.opacity
    ctx.strokeStyle = annotation.color
    ctx.fillStyle = annotation.color
    ctx.lineWidth = toLength(annotation.strokeWidth, box)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const rect = toPixels(annotation.rect, box)
    if (annotation.kind === 'box') drawBox(ctx, annotation, rect, box)
    else if (annotation.kind === 'ellipse') drawEllipse(ctx, annotation, rect)
    else if (annotation.kind === 'arrow') drawArrow(ctx, annotation, rect, box)
    else if (annotation.kind === 'line') drawLine(ctx, rect)
    else if (annotation.kind === 'badge') {
      drawBadge(ctx, annotation, rect, box, numbers.get(annotation.id) ?? 1)
    } else if (annotation.kind === 'text') {
      const edited = editing?.id === annotation.id ? editing : null
      drawLabel(ctx, annotation, rect, toLength(annotation.size, box), edited)
    }

    ctx.restore()
  }

  ctx.restore()
}

/** Remplissage translucide d'une forme fermée, `null` si le fill est nul. */
function fillStyle(annotation: Annotation): string | null {
  if (annotation.fill <= 0) return null
  return css(hexToRgb(annotation.color), annotation.fill)
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  rect: Rect,
  box: WindowBox,
): void {
  const { x, y, w, h } = normalizeRect(rect)
  const radius = Math.min(toLength(annotation.radius, box), w / 2, h / 2)

  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.max(0, radius))

  const fill = fillStyle(annotation)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  ctx.stroke()
}

function drawEllipse(ctx: CanvasRenderingContext2D, annotation: Annotation, rect: Rect): void {
  const { x, y, w, h } = normalizeRect(rect)

  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)

  const fill = fillStyle(annotation)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  ctx.stroke()
}

/** Trait simple. Le rect garde son signe : le sens du tracé est conservé. */
function drawLine(ctx: CanvasRenderingContext2D, rect: Rect): void {
  ctx.beginPath()
  ctx.moveTo(rect.x, rect.y)
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h)
  ctx.stroke()
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  rect: Rect,
  box: WindowBox,
): void {
  const head = toLength(annotation.arrowHead, box)
  // `w` et `h` sont signés : la flèche pointe dans les quatre quadrants.
  const angle = Math.atan2(rect.h, rect.w)
  const tip = { x: rect.x + rect.w, y: rect.y + rect.h }

  ctx.beginPath()
  ctx.moveTo(rect.x, rect.y)
  ctx.lineTo(tip.x - Math.cos(angle) * head * 0.7, tip.y - Math.sin(angle) * head * 0.7)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(tip.x, tip.y)
  ctx.lineTo(tip.x - Math.cos(angle - 0.4) * head, tip.y - Math.sin(angle - 0.4) * head)
  ctx.lineTo(tip.x - Math.cos(angle + 0.4) * head, tip.y - Math.sin(angle + 0.4) * head)
  ctx.closePath()
  ctx.fill()
}

/** Pastille numérotée. Son numéro est son rang, il n'est jamais stocké. */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  rect: Rect,
  box: WindowBox,
  number: number,
): void {
  const radius = badgeRadius(annotation, box)
  const cx = rect.x + radius
  const cy = rect.y + radius

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  // Inversé, la pastille devient un contour : le numéro reprend la couleur du
  // calque, le disque le fond de scène.
  if (annotation.invert) {
    ctx.fillStyle = STAGE
    ctx.fill()
    ctx.lineWidth = Math.max(1, radius * 0.14)
    ctx.stroke()
  } else {
    ctx.fill()
  }

  ctx.fillStyle = annotation.invert ? annotation.color : inkOn(annotation.color)
  ctx.font = `600 ${toLength(annotation.size, box)}px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(number), cx, cy)
}

/**
 * Label. `invert` échange le fond et l'encre : pastille à la couleur du calque,
 * texte automatiquement noir ou blanc selon son contraste. Sans effet sur
 * `plain`, qui n'a pas de fond à remplir.
 *
 * `editing` porte la saisie en cours. Le caret est dessiné ici et nulle part
 * ailleurs : c'est la seule façon qu'il tombe au bon pixel quelle que soit
 * l'échelle et l'inclinaison de la fenêtre. Un label en cours de saisie garde
 * sa pastille même vide — sinon elle clignoterait avec le curseur.
 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  rect: Rect,
  fontSize: number,
  editing: { caret: number; blink: boolean } | null = null,
): void {
  const label = annotation.text.trim()
  if (!label && !editing) return

  const style: LabelStyle = annotation.labelStyle
  ctx.font = `${fontSize}px ${MONO}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  const filled = annotation.invert && style !== 'plain'
  const padX = style === 'plain' ? 0 : fontSize * 0.8
  const padY = style === 'plain' ? 0 : fontSize * 0.55
  const width = ctx.measureText(label).width + padX * 2
  const height = fontSize + padY * 2

  if (style !== 'plain') {
    ctx.fillStyle = filled ? annotation.color : STAGE
    ctx.beginPath()
    ctx.roundRect(rect.x, rect.y, width, height, style === 'pill' ? height / 2 : fontSize * 0.35)
    ctx.fill()
    if (!filled) {
      ctx.strokeStyle = annotation.color
      ctx.lineWidth = Math.max(1, fontSize * 0.09)
      ctx.stroke()
    }
  }

  const ink = filled ? inkOn(annotation.color) : annotation.color
  ctx.fillStyle = ink
  ctx.fillText(label, rect.x + padX, rect.y + height / 2)

  if (!editing || !editing.blink) return
  const caret = Math.max(0, Math.min(editing.caret, label.length))
  const offset = ctx.measureText(label.slice(0, caret)).width
  ctx.fillRect(
    rect.x + padX + offset,
    rect.y + height / 2 - fontSize * 0.6,
    Math.max(1, fontSize * 0.06),
    fontSize * 1.2,
  )
}
