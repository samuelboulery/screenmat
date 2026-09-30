import { TEXT_FAMILIES } from './text.ts'

/* Les trames dessinées : huit façons de poser une encre sur un fond, toutes
   pilotées par la même grandeur — la quantité d'encre en un point, de 0 à 1,
   lue dans le mesh. Tout se mesure en cellules (`cell`, une fraction de la
   largeur) : l'export 3× est l'homothétique du 1×. Le fond est déjà peint et
   l'encre déjà en main (`fillStyle`, `strokeStyle`) quand un motif est appelé.

   Une forme par `fill` ou `stroke`, jamais un chemin cumulé : sous Skia, un
   chemin de dizaines de milliers de sous-chemins se recompose à chaque ajout. */

export type PatternInput = {
  width: number
  height: number
  /** Côté d'une cellule, en pixels du canvas. */
  cell: number
  /** Angle du réseau, en radians. */
  angle: number
  /** Quantité d'encre au point (x, y), en pixels du canvas. Continue. */
  amount: (x: number, y: number) => number
  /** Seconde encre, pour les motifs à deux passes. */
  accent: string
  ground: string
  random: () => number
}

type Paint = (ctx: CanvasRenderingContext2D, input: PatternInput) => void

/** Parcourt un réseau tourné autour du centre, assez large pour les coins. */
function lattice(input: PatternInput, step: number, angle: number, visit: (x: number, y: number, cos: number, sin: number) => void): void {
  const { width, height } = input
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const reach = Math.ceil(Math.hypot(width, height) / 2 / step)
  for (let b = -reach; b <= reach; b++) {
    for (let a = -reach; a <= reach; a++) {
      const x = width / 2 + a * step * cos - b * step * sin
      const y = height / 2 + a * step * sin + b * step * cos
      if (x < -step || y < -step || x > width + step || y > height + step) continue
      visit(x, y, cos, sin)
    }
  }
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  if (radius <= 0) return
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

/** Diffusion d'erreur d'Atkinson : six voisins, un huitième chacun, un quart de
 *  l'erreur perdu — d'où les aplats francs de MacPaint. Cellules sur des bords
 *  entiers : deux couleurs exactement, aucun lissage. */
const atkinson: Paint = (ctx, { width, height, cell, amount }) => {
  const cols = Math.ceil(width / cell)
  const rows = Math.ceil(height / cell)
  const levels = new Float32Array(cols * rows)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) levels[j * cols + i] = amount((i + 0.5) * cell, (j + 0.5) * cell)
  }
  const push = (index: number, error: number) => {
    levels[index] = levels[index]! + error
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i
      const on = levels[k]! > 0.5
      const error = (levels[k]! - (on ? 1 : 0)) / 8
      if (i + 1 < cols) push(k + 1, error)
      if (i + 2 < cols) push(k + 2, error)
      if (j + 1 < rows) {
        if (i > 0) push(k + cols - 1, error)
        push(k + cols, error)
        if (i + 1 < cols) push(k + cols + 1, error)
      }
      if (j + 2 < rows) push(k + 2 * cols, error)
      if (!on) continue
      const x = Math.floor(i * cell)
      const y = Math.floor(j * cell)
      ctx.fillRect(x, y, Math.floor((i + 1) * cell) - x, Math.floor((j + 1) * cell) - y)
    }
  }
}

/** Pointillé : points de taille fixe, densité variable. Le seuil suit la suite
 *  R2, qui répartit comme un bruit bleu sans table à embarquer. */
const stipple: Paint = (ctx, { width, height, cell, amount, random }) => {
  const step = cell * 0.8
  for (let j = 0; j * step < height + step; j++) {
    for (let i = 0; i * step < width + step; i++) {
      const x = (i + random()) * step
      const y = (j + random()) * step
      const threshold = (0.7548776662 * i + 0.56984029 * j) % 1
      if (amount(x, y) * 0.95 > threshold) dot(ctx, x, y, cell * 0.3)
    }
  }
}

/** Hachures croisées de gravure : une direction de plus par palier d'encre. */
const crosshatch: Paint = (ctx, input) => {
  const { cell, angle, amount } = input
  const step = cell * 1.15
  const passes: ReadonlyArray<readonly [number, number]> = [
    [angle, 0.12],
    [angle + Math.PI / 2, 0.38],
    [angle + Math.PI / 4, 0.62],
    [angle - Math.PI / 4, 0.82],
  ]
  for (const [direction, threshold] of passes) {
    lattice(input, step, direction, (x, y, cos, sin) => {
      const level = amount(x, y)
      if (level <= threshold) return
      const half = step * 0.52
      const thick = cell * (0.06 + 0.09 * level)
      ctx.beginPath()
      ctx.moveTo(x - half * cos + thick * sin, y - half * sin - thick * cos)
      ctx.lineTo(x + half * cos + thick * sin, y + half * sin - thick * cos)
      ctx.lineTo(x + half * cos - thick * sin, y + half * sin + thick * cos)
      ctx.lineTo(x - half * cos - thick * sin, y - half * sin + thick * cos)
      ctx.fill()
    })
  }
}

/** Nombre de courbes de niveau ; une sur quatre est une courbe maîtresse. */
const CONTOUR_LEVELS = 24

/** Lignes de niveau : le mesh lu comme un relief, par carrés en marche sur la
 *  grille des cellules. */
const contours: Paint = (ctx, { width, height, cell, amount }) => {
  const cols = Math.ceil(width / cell) + 1
  const rows = Math.ceil(height / cell) + 1
  const nodes = new Float32Array(cols * rows)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) nodes[j * cols + i] = amount(i * cell, j * cell)
  }
  ctx.lineCap = 'round'
  const segment = (from: readonly [number, number], to: readonly [number, number]) => {
    ctx.beginPath()
    ctx.moveTo(from[0], from[1])
    ctx.lineTo(to[0], to[1])
    ctx.stroke()
  }
  for (let k = 0; k < CONTOUR_LEVELS; k++) {
    const level = (k + 0.5) / CONTOUR_LEVELS
    // En cellules, comme le reste : le trait suit la taille de trame, et se
    // lit encore sur une vignette.
    ctx.lineWidth = cell * (k % 4 === 0 ? 0.4 : 0.18)
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = nodes[j * cols + i]!
        const b = nodes[j * cols + i + 1]!
        const c = nodes[(j + 1) * cols + i + 1]!
        const d = nodes[(j + 1) * cols + i]!
        const x = i * cell
        const y = j * cell
        // Les points où la courbe traverse les quatre côtés de la cellule.
        const cuts: Array<readonly [number, number]> = []
        if (a < level !== b < level) cuts.push([x + (cell * (level - a)) / (b - a), y])
        if (b < level !== c < level) cuts.push([x + cell, y + (cell * (level - b)) / (c - b)])
        if (d < level !== c < level) cuts.push([x + (cell * (level - d)) / (c - d), y + cell])
        if (a < level !== d < level) cuts.push([x, y + (cell * (level - a)) / (d - a)])
        if (cuts.length >= 2) segment(cuts[0]!, cuts[1]!)
        if (cuts.length === 4) segment(cuts[2]!, cuts[3]!)
      }
    }
  }
}

/** Lignes de crête : chaque ligne se soulève avec l'encre et masque celles de
 *  derrière, du haut vers le bas. */
const ridgelines: Paint = (ctx, { width, height, cell, amount, ground }) => {
  const gap = cell * 2.4
  const lift = cell * 20
  const dx = cell / 2
  ctx.lineWidth = cell * 0.23
  ctx.lineJoin = 'round'
  for (let base = gap; base < height + lift; base += gap) {
    const trace = () => {
      ctx.beginPath()
      // Le premier `lineTo` d'un chemin vide vaut `moveTo`.
      for (let x = 0; x <= width + dx; x += dx) ctx.lineTo(x, base - lift * amount(x, base))
    }
    trace()
    ctx.lineTo(width + dx, base + gap)
    ctx.lineTo(0, base + gap)
    ctx.closePath()
    ctx.fillStyle = ground
    ctx.fill()
    trace()
    ctx.stroke()
  }
}

/** Riso : deux trames de points, deux encres, un calage volontairement faux.
 *  La seconde passe lit le mesh décalé d'un quart de canvas : les deux encres
 *  ne se concentrent pas aux mêmes endroits. */
const riso: Paint = (ctx, input) => {
  const { width, height, cell, angle, amount, accent } = input
  const step = cell * 1.5
  const ink = ctx.fillStyle
  const shift = cell * 0.45
  // Les encres s'additionnent comme de la lumière là où elles se recouvrent.
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = accent
  lattice(input, step, angle + Math.PI / 6, (x, y) => {
    const level = amount((x + width / 4) % width, (y + height / 4) % height)
    dot(ctx, x + shift, y + shift, step * 0.6 * Math.sqrt(level))
  })
  ctx.fillStyle = ink
  lattice(input, step, angle, (x, y) => dot(ctx, x, y, step * 0.6 * Math.sqrt(amount(x, y))))
}

/** Du plus léger au plus dense. L'espace ne se dessine pas. */
const GLYPH_RAMP = ' .:-=+*#%@'

/** Glyphes : la police mono du produit, un caractère par cellule, choisi par
 *  densité d'encre. */
const glyphs: Paint = (ctx, { width, height, cell, amount }) => {
  const size = cell * 2.2
  const stepX = size * 0.62
  const stepY = size * 1.05
  ctx.font = `400 ${size}px ${TEXT_FAMILIES.mono}`
  ctx.textBaseline = 'top'
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const level = Math.min(GLYPH_RAMP.length - 1, Math.floor(amount(x + stepX / 2, y + stepY / 2) * GLYPH_RAMP.length))
      if (level > 0) ctx.fillText(GLYPH_RAMP[level]!, x, y)
    }
  }
}

/** Truchet : deux quarts de cercle par tuile, orientés par la graine, épaissis
 *  par l'encre. Les tuiles se raccordent en un labyrinthe. */
const truchet: Paint = (ctx, { width, height, cell, amount, random }) => {
  const tile = cell * 4
  const arc = (cx: number, cy: number, from: number) => {
    ctx.beginPath()
    ctx.arc(cx, cy, tile / 2, from, from + Math.PI / 2)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const flip = random() < 0.5
      ctx.lineWidth = tile * (0.05 + 0.42 * amount(x + tile / 2, y + tile / 2))
      if (flip) {
        arc(x, y, 0)
        arc(x + tile, y + tile, Math.PI)
      } else {
        arc(x + tile, y, Math.PI / 2)
        arc(x, y + tile, -Math.PI / 2)
      }
    }
  }
}

/** Source unique des motifs : leur ordre est celui de la grille, et `angle` dit
 *  lesquels lisent `ditherAngle` — les autres sont alignés sur leur grille. */
export const PATTERNS = {
  atkinson: { angle: false, paint: atkinson },
  stipple: { angle: false, paint: stipple },
  crosshatch: { angle: true, paint: crosshatch },
  contours: { angle: false, paint: contours },
  ridgelines: { angle: false, paint: ridgelines },
  riso: { angle: true, paint: riso },
  glyphs: { angle: false, paint: glyphs },
  truchet: { angle: false, paint: truchet },
} as const satisfies Record<string, { angle: boolean; paint: Paint }>

export type Pattern = keyof typeof PATTERNS
