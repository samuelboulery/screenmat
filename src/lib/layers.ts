import { badgeNumbers, badgeRadius, normalizeRect, toLength, toPixels, type Rect } from './annotate.ts'
import { css, hexToRgb, inkOn } from './color.ts'
import { windowTransform } from './frame.ts'
import type { WindowBox } from './render.ts'
import { layoutText, shadowFor } from './text.ts'
import type { Annotation } from '../types.ts'

/* Dessin des calques. Un seul chemin : la preview et l'export appellent les
   mêmes fonctions, avec la même `WindowBox` à des échelles différentes. */

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const STAGE = 'rgba(7, 7, 10, 0.78)'

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

    // L'ombre porte sur tout ce que le calque dessine ; un texte la réserve à
    // sa plaque (voir `drawLabel`).
    const shadow = shadowFor(annotation.shadow, box)
    if (shadow && annotation.kind !== 'text') applyShadow(ctx, shadow)

    const rect = toPixels(annotation.rect, box)
    if (annotation.kind === 'box') drawBox(ctx, annotation, rect, box)
    else if (annotation.kind === 'ellipse') drawEllipse(ctx, annotation, rect)
    else if (annotation.kind === 'arrow') drawArrow(ctx, annotation, rect, box)
    else if (annotation.kind === 'line') drawLine(ctx, rect)
    else if (annotation.kind === 'badge') {
      drawBadge(ctx, annotation, rect, box, numbers.get(annotation.id) ?? 1)
    } else if (annotation.kind === 'text') {
      const edited = editing?.id === annotation.id ? editing : null
      drawLabel(ctx, annotation, rect, box, edited)
    }

    ctx.restore()
  }

  ctx.restore()
}

/** Remplit puis trace une forme fermée. L'ombre ne porte que sur le premier
 *  des deux : doublée, celle du trait se poserait sur le fond. */
function strokeAndFill(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
  const fill = fillStyle(annotation)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
    clearShadow(ctx)
  }
  // Sans fond, le contour se trace toujours, et jamais à zéro : une forme ne
  // peut pas être invisible.
  if (!annotation.stroke && fill) return
  ctx.strokeStyle = css(hexToRgb(annotation.color), fill ? annotation.strokeOpacity : annotation.strokeOpacity || 1)
  ctx.stroke()
}

/** Remplissage d'une forme fermée, `null` si le fill est nul. */
function fillStyle(annotation: Annotation): string | null {
  if (annotation.fill <= 0) return null
  return css(hexToRgb(annotation.fillColor), annotation.fill)
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

  strokeAndFill(ctx, annotation)
}

function drawEllipse(ctx: CanvasRenderingContext2D, annotation: Annotation, rect: Rect): void {
  const { x, y, w, h } = normalizeRect(rect)

  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)

  strokeAndFill(ctx, annotation)
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
  fillInkCentered(ctx, String(number), cx, cy)
}

/**
 * Pose un texte pour que son **encre** soit centrée sur le point. `textAlign =
 * 'center'` centre la largeur d'avance et `textBaseline = 'middle'` la boîte
 * em : un « 1 » s'y lit décalé, d'un écart qui change avec la police et le
 * moteur — et la pile mono d'une pastille n'est pas la même d'une machine à
 * l'autre.
 */
function fillInkCentered(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number): void {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const metrics = ctx.measureText(text)
  const dx = (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2
  const dy = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2

  if (Number.isFinite(dx + dy)) {
    ctx.fillText(text, cx - dx, cy + dy)
    return
  }
  // Moteur sans boîte d'encre : le centrage approché d'avant.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy)
}

/** Hauteur de capitale de la police courante. Un texte se centre sur elle, pas
 *  sur l'encre de sa ligne : celle-ci change à chaque lettre saisie, et le
 *  texte sauterait sous le curseur. */
function capHeight(ctx: CanvasRenderingContext2D, fontSize: number): number {
  const height = ctx.measureText('H').actualBoundingBoxAscent
  return Number.isFinite(height) && height > 0 ? height : fontSize * 0.7
}

type Shadow = NonNullable<ReturnType<typeof shadowFor>>

function applyShadow(ctx: CanvasRenderingContext2D, shadow: Shadow): void {
  ctx.shadowColor = shadow.color
  ctx.shadowBlur = shadow.blur
  ctx.shadowOffsetY = shadow.offsetY
}

function clearShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
}

/**
 * Texte, sur une ou plusieurs lignes, avec sa plaque. L'ombre va à la plaque
 * quand elle existe — doubler celle du texte dessus le rendrait flou — et au
 * texte seul sinon.
 *
 * `editing` porte la saisie en cours. Le caret est dessiné ici et nulle part
 * ailleurs : c'est la seule façon qu'il tombe au bon pixel quelle que soit
 * l'échelle et l'inclinaison de la fenêtre. Un texte en cours de saisie garde
 * sa plaque même vide — sinon elle clignoterait avec le curseur.
 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  rect: Rect,
  box: WindowBox,
  editing: { caret: number; blink: boolean } | null = null,
): void {
  if (!annotation.text.trim() && !editing) return

  const layout = layoutText(annotation, box)
  const shadow = shadowFor(annotation.shadow, box)
  const plate = annotation.background

  if (plate.on) {
    if (shadow) applyShadow(ctx, shadow)
    ctx.fillStyle = css(hexToRgb(plate.color), plate.opacity)
    ctx.beginPath()
    ctx.roundRect(rect.x, rect.y, layout.width, layout.height, plate.radius * layout.fontSize)
    ctx.fill()
    clearShadow(ctx)
  } else if (shadow) {
    applyShadow(ctx, shadow)
  }

  ctx.font = layout.font
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = annotation.color
  const rise = capHeight(ctx, layout.fontSize) / 2

  const inner = layout.width - layout.padX * 2
  const lineX = (width: number) =>
    rect.x +
    layout.padX +
    (annotation.align === 'center' ? (inner - width) / 2 : annotation.align === 'right' ? inner - width : 0)
  const lineY = (index: number) => rect.y + layout.padY + layout.lineHeight * (index + 0.5)

  layout.lines.forEach((line, index) => ctx.fillText(line.text, lineX(line.width), lineY(index) + rise))

  if (!editing || !editing.blink) return
  clearShadow(ctx)
  const row = caretRow(layout.lines, editing.caret)
  const line = layout.lines[row]
  const column = Math.max(0, Math.min(editing.caret - line.start, line.text.length))
  const offset = ctx.measureText(line.text.slice(0, column)).width
  ctx.fillRect(
    lineX(line.width) + offset,
    lineY(row) - layout.fontSize * 0.6,
    Math.max(1, layout.fontSize * 0.06),
    layout.fontSize * 1.2,
  )
}

/** La ligne qui porte le caret : la dernière qui commence avant lui. */
function caretRow(lines: readonly { start: number }[], caret: number): number {
  let row = 0
  lines.forEach((line, index) => {
    if (line.start <= caret) row = index
  })
  return row
}
