import { describe, expect, it } from 'vitest'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { inspect, render } from '../api.ts'

/** Un screenshot d'un seul ton : tout écart de couleur vient du calque. */
function plain(width = 600, height = 400, color = '#e8e8e8'): Buffer {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return canvas.toBuffer('image/png')
}

/** Rien autour du screenshot ne bouge : ni grain, ni ombre, ni coin arrondi. */
const FLAT = { format: 'png', frame: 'none', radius: 0, shadow: 0, grain: 0, background: 'solid' } as const

type Pixels = { data: Uint8ClampedArray; width: number; height: number }
type Box = { left: number; top: number; right: number; bottom: number }

async function draw(spec: Parameters<typeof render>[0]): Promise<Pixels> {
  const { buffer, width, height } = await render(spec)
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(await loadImage(buffer), 0, 0)
  return { data: ctx.getImageData(0, 0, width, height).data, width, height }
}

const at = (image: Pixels, x: number, y: number) => {
  const i = (Math.round(y) * image.width + Math.round(x)) * 4
  return [image.data[i], image.data[i + 1], image.data[i + 2]] as const
}

/** Le plus grand écart de canal entre deux rendus, et la boîte de ce qui diffère. */
function diff(a: Pixels, b: Pixels, tolerance = 2): { worst: number; box: Box } {
  const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  let worst = 0
  for (let i = 0; i < a.data.length; i += 4) {
    const gap = Math.max(
      Math.abs(a.data[i] - b.data[i]),
      Math.abs(a.data[i + 1] - b.data[i + 1]),
      Math.abs(a.data[i + 2] - b.data[i + 2]),
    )
    worst = Math.max(worst, gap)
    if (gap <= tolerance) continue
    const x = (i / 4) % a.width
    const y = Math.floor(i / 4 / a.width)
    box.left = Math.min(box.left, x)
    box.right = Math.max(box.right, x)
    box.top = Math.min(box.top, y)
    box.bottom = Math.max(box.bottom, y)
  }
  return { worst, box }
}

const shot = plain()

describe('floutage — bord', () => {
  it.each([1, 3])('ne laisse aucun liseré autour d’une zone floutée, à l’échelle %i', async (scale) => {
    // Le flou d'un aplat est cet aplat : le moindre pixel qui change est l'aplat
    // des zones masquées qui fuit sous le flou.
    const bare = await draw({ input: shot, settings: FLAT, scale })
    const blurred = await draw({
      shots: [{
        input: shot,
        layers: [{ kind: 'redaction', redaction: 'blur', rect: { x: 0.2003, y: 0.1507, w: 0.4011, h: 0.2003 } }],
      }],
      settings: FLAT,
      scale,
    })
    expect(diff(bare, blurred).worst).toBeLessThanOrEqual(2)
  })

  it('garde l’aplat sur la part d’une zone qui déborde du screenshot', async () => {
    const settings = { ...FLAT, frame: 'browser', titleBar: true } as const
    const bare = await draw({ input: shot, settings, scale: 1 })
    const over = await draw({
      shots: [{ input: shot, layers: [{ kind: 'redaction', rect: { x: 0.2, y: 0, w: 0.4, h: 0.2 } }] }],
      settings,
      scale: 1,
    })
    const { box } = diff(bare, over)
    // La barre de titre, en haut de la zone, est couverte de l'aplat sombre.
    const [r, g, b] = at(over, (box.left + box.right) / 2, box.top + 3)
    expect(Math.max(r, g, b)).toBeLessThan(40)
  })

  it('couvre en entier le pixel où le bord du screenshot tombe à cheval', async () => {
    // Deux colonnes noires au bord gauche d'une image claire : ce que la zone
    // doit faire disparaître. Sous un cadre, le bord de l'écran n'est pas entier.
    const canvas = createCanvas(600, 400)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, 600, 400)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 2, 400)
    const edged = canvas.toBuffer('image/png')

    const settings = { ...FLAT, frame: 'macbook' } as const
    const { screen } = await inspect(edged, { frame: 'macbook' })
    const rect = { x: screen.x, y: screen.y + screen.h * 0.25, w: screen.w * 0.5, h: screen.h * 0.5 }

    const bare = await draw({ input: edged, settings, scale: 1 })
    const blurred = await draw({
      shots: [{ input: edged, layers: [{ kind: 'redaction', redaction: 'blur', rect }] }],
      settings,
      scale: 1,
    })
    const { box } = diff(bare, blurred)
    const cy = (box.top + box.bottom) / 2
    // Le pixel du bord porte le même flou que ses voisins : rien de l'original
    // n'y transparaît.
    const [edge] = at(blurred, box.left, cy)
    const [next] = at(blurred, box.left + 2, cy)
    expect(Math.abs(edge - next)).toBeLessThanOrEqual(12)
  })

  it('floute vraiment, rectangle comme ellipse, une zone après l’autre', async () => {
    // Du bruit : un pixel resté net y garde sa valeur, un pixel flouté la perd.
    const canvas = createCanvas(600, 400)
    const ctx = canvas.getContext('2d')
    let seed = 7
    for (let y = 0; y < 400; y += 2) {
      for (let x = 0; x < 600; x += 2) {
        seed = (seed * 16807) % 2147483647
        const tone = seed % 256
        ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`
        ctx.fillRect(x, y, 2, 2)
      }
    }
    const noise = canvas.toBuffer('image/png')
    const layers = [
      { kind: 'redaction', redaction: 'blur', rect: { x: 0.1, y: 0.05, w: 0.3, h: 0.2 } },
      { kind: 'redaction', redaction: 'blur', redactionShape: 'ellipse', rect: { x: 0.5, y: 0.3, w: 0.4, h: 0.3 } },
      // Après l'ellipse : son clip ne doit pas rogner la zone suivante.
      { kind: 'redaction', redaction: 'blur', rect: { x: 0.1, y: 0.4, w: 0.3, h: 0.2 } },
    ] as const
    // Sans marge, la fenêtre est le canvas : une fraction vaut pour les deux.
    const settings = { ...FLAT, padding: 0 }
    const bare = await draw({ input: noise, settings, scale: 1 })
    const blurred = await draw({ shots: [{ input: noise, layers }], settings, scale: 1 })

    const { width } = blurred
    // La fenêtre est centrée en hauteur dans le canvas.
    const top = (blurred.height - (width * 400) / 600) / 2
    const same = (x: number, y: number) => Math.abs(at(blurred, x, y)[0] - at(bare, x, y)[0]) <= 3
    /** Part des pixels restés tels quels dans une boîte, en fractions de la largeur. */
    const kept = (x0: number, y0: number, x1: number, y1: number, inside = (_x: number, _y: number) => true) => {
      let total = 0
      let unchanged = 0
      for (let y = Math.ceil(y0 * width); y < y1 * width; y += 1) {
        for (let x = Math.ceil(x0 * width); x < x1 * width; x += 1) {
          if (!inside(x, y)) continue
          total += 1
          if (same(x, y + top)) unchanged += 1
        }
      }
      return unchanged / total
    }
    // Un flou croise par hasard la valeur d'origine ici ou là : jamais sur une
    // part qui laisserait lire quoi que ce soit.
    expect(kept(0.1, 0.05, 0.4, 0.25)).toBeLessThan(0.1)
    expect(kept(0.1, 0.4, 0.4, 0.6)).toBeLessThan(0.1)
    const round = (x: number, y: number) =>
      ((x / width - 0.7) / 0.2) ** 2 + ((y / width - 0.45) / 0.15) ** 2 < 0.97
    expect(kept(0.5, 0.3, 0.9, 0.6, round)).toBeLessThan(0.1)
    // Hors des zones, rien n'a bougé.
    expect(kept(0.42, 0.05, 0.48, 0.25)).toBe(1)
  })
})

describe('floutage — ellipse', () => {
  const zone = { kind: 'redaction', redaction: 'solid', rect: { x: 0.2, y: 0.1, w: 0.6, h: 0.4 } } as const

  it('masque le centre et laisse les coins de sa boîte', async () => {
    const bare = await draw({ input: shot, settings: FLAT, scale: 1 })
    const square = await draw({ shots: [{ input: shot, layers: [zone] }], settings: FLAT, scale: 1 })
    const round = await draw({
      shots: [{ input: shot, layers: [{ ...zone, redactionShape: 'ellipse' }] }],
      settings: FLAT,
      scale: 1,
    })

    const { box } = diff(bare, square)
    const middle = at(round, (box.left + box.right) / 2, (box.top + box.bottom) / 2)
    expect(Math.max(...middle)).toBeLessThan(40)
    // Le coin de la boîte : masqué par le rectangle, intact sous l'ellipse.
    expect(Math.max(...at(square, box.left + 4, box.top + 4))).toBeLessThan(40)
    expect(at(round, box.left + 4, box.top + 4)).toEqual(at(bare, box.left + 4, box.top + 4))
  })
})

describe('formes — fond et contour', () => {
  const RED = '#ff0000'
  const BLUE = '#0000ff'
  const shape = { kind: 'box', rect: { x: 0.2, y: 0.1, w: 0.6, h: 0.4 }, radius: 0, strokeWidth: 0.01, fill: 1 } as const

  const middleOf = (box: Box) => [(box.left + box.right) / 2, (box.top + box.bottom) / 2] as const

  it('remplit d’une couleur et trace d’une autre', async () => {
    const bare = await draw({ input: shot, settings: FLAT, scale: 1 })
    const drawn = await draw({
      shots: [{ input: shot, layers: [{ ...shape, color: BLUE, fillColor: RED }] }],
      settings: FLAT,
      scale: 1,
    })
    const { box } = diff(bare, drawn)
    const [cx, cy] = middleOf(box)
    expect(at(drawn, cx, cy)).toEqual([255, 0, 0])
    expect(at(drawn, box.left + 3, cy)).toEqual([0, 0, 255])
  })

  it('reprend la couleur du trait quand le fond n’en a pas', async () => {
    const bare = await draw({ input: shot, settings: FLAT, scale: 1 })
    const drawn = await draw({ shots: [{ input: shot, layers: [{ ...shape, color: BLUE }] }], settings: FLAT, scale: 1 })
    const [cx, cy] = middleOf(diff(bare, drawn).box)
    expect(at(drawn, cx, cy)).toEqual([0, 0, 255])
  })

  it('ne trace pas un contour coupé', async () => {
    const bare = await draw({ input: shot, settings: FLAT, scale: 1 })
    const drawn = await draw({
      shots: [{ input: shot, layers: [{ ...shape, color: BLUE, fillColor: RED, stroke: false }] }],
      settings: FLAT,
      scale: 1,
    })
    const { box } = diff(bare, drawn)
    expect(at(drawn, box.left + 3, (box.top + box.bottom) / 2)).toEqual([255, 0, 0])
  })
})

describe('formes — transparence du contour', () => {
  const edge = async (strokeOpacity?: number) => {
    const bare = await draw({ input: shot, settings: FLAT, scale: 1 })
    const layer = { kind: 'box', rect: { x: 0.2, y: 0.1, w: 0.6, h: 0.4 }, radius: 0, strokeWidth: 0.01, color: '#0000ff' } as const
    const drawn = await draw({
      shots: [{ input: shot, layers: [strokeOpacity === undefined ? layer : { ...layer, strokeOpacity }] }],
      settings: FLAT,
      scale: 1,
    })
    const { box } = diff(bare, drawn)
    return at(drawn, box.left + 3, (box.top + box.bottom) / 2)
  }

  it('mélange un contour translucide à ce qu’il recouvre', async () => {
    // Bleu à 50 % sur #e8e8e8 : à mi-chemin des deux.
    const [r, g, b] = await edge(0.5)
    expect(r).toBeGreaterThan(100)
    expect(r).toBeLessThan(130)
    expect(g).toBe(r)
    expect(b).toBeGreaterThan(232)
  })

  it('trace un contour plein sans le champ', async () => {
    expect(await edge()).toEqual([0, 0, 255])
  })

  it('garde visible une forme sans fond dont le contour est à zéro', async () => {
    expect(await edge(0)).toEqual([0, 0, 255])
  })
})

describe('formes — jamais invisibles', () => {
  it('trace le contour d’une forme sans fond, même coupé', async () => {
    const bare = await draw({ input: shot, settings: FLAT, scale: 1 })
    const drawn = await draw({
      shots: [{
        input: shot,
        layers: [{ kind: 'ellipse', rect: { x: 0.2, y: 0.1, w: 0.6, h: 0.4 }, color: '#0000ff', strokeWidth: 0.01, fill: 0, stroke: false }],
      }],
      settings: FLAT,
      scale: 1,
    })
    const { box } = diff(bare, drawn)
    expect(at(drawn, box.left + 3, (box.top + box.bottom) / 2)).toEqual([0, 0, 255])
  })
})

describe('iPhone couché — côté de l’île', () => {
  const wide = plain(800, 400)
  const phone = { ...FLAT, frame: 'iphone' } as const

  it('pose l’île à gauche par défaut, à droite sur demande', async () => {
    const left = await draw({ input: wide, settings: phone, scale: 1 })
    const right = await draw({ input: wide, settings: { ...phone, islandSide: 'right' }, scale: 1 })

    // Ce qui diffère entre les deux rendus, ce sont les deux îles.
    const { box } = diff(left, right)
    expect(box.right - box.left).toBeGreaterThan(left.width / 2)
    const cy = (box.top + box.bottom) / 2
    const dark = (image: Pixels, x: number) => Math.max(...at(image, x, cy)) < 60

    expect(dark(left, box.left + 3)).toBe(true)
    expect(dark(left, box.right - 3)).toBe(false)
    expect(dark(right, box.left + 3)).toBe(false)
    expect(dark(right, box.right - 3)).toBe(true)
  })
})
