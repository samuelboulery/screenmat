import { describe, expect, it } from 'vitest'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { readFile, stat } from 'node:fs/promises'
import { BASE_WIDTH, inspect, render } from '../api.ts'
import { DITHERS, isDither } from '../../src/lib/dithered.ts'
import { SERIES } from '../../src/lib/series.ts'
import { WALLPAPERS, wallpaperPath } from '../../src/lib/wallpapers.ts'

/** Un screenshot minuscule, généré en mémoire : le rendu ne dépend pas d'un
 *  fichier de fixture, et le test reste rapide. */
function fixture(width = 400, height = 300): Buffer {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1d4ed8'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(20, 20, width - 40, 60)
  return canvas.toBuffer('image/png')
}

const shot = fixture()

describe('render — géométrie', () => {
  it('dimensionne le canvas sur BASE_WIDTH × l’échelle', async () => {
    const one = await render({ input: shot, scale: 1 })
    const three = await render({ input: shot, scale: 3 })

    expect(one.width).toBe(BASE_WIDTH)
    expect(three.width).toBe(BASE_WIDTH * 3)
    // L'export 3× est l'homothétique exact du 1× : même rapport, au pixel de
    // l'arrondi près.
    expect(three.height / three.width).toBeCloseTo(one.height / one.width, 3)
  })

  it('respecte le ratio demandé', async () => {
    const wide = await render({ input: shot, settings: { ratio: '16:9' }, scale: 1 })
    expect(wide.width / wide.height).toBeCloseTo(16 / 9, 2)
  })
})

describe('render — grille et placement', () => {
  const five = Array.from({ length: 5 }, () => ({ input: shot }))

  it('rend une grille de cinq shots sans échouer ni déborder', async () => {
    const grid = await render({
      shots: five,
      composition: { layout: 'side', columns: 3 },
      settings: { ratio: '16:9' },
      scale: 1,
    })
    expect(grid.width).toBe(BASE_WIDTH)
    expect(grid.width / grid.height).toBeCloseTo(16 / 9, 2)
  })

  it('produit une image différente quand un shot est retouché', async () => {
    const base = await render({ shots: five, composition: { layout: 'side' }, scale: 1 })
    const moved = await render({
      shots: [{ input: shot, placement: { scale: 0.6, dy: 0.2 } }, ...five.slice(1)],
      composition: { layout: 'side' },
      scale: 1,
    })
    expect(base.buffer.equals(moved.buffer)).toBe(false)
  })
})

describe('render — déterminisme', () => {
  it('rend deux fois le même octet à graine égale', async () => {
    const a = await render({ input: shot, settings: { seed: 7 }, scale: 1 })
    const b = await render({ input: shot, settings: { seed: 7 }, scale: 1 })
    expect(a.buffer.equals(b.buffer)).toBe(true)
  })

  it('rend autre chose à graine différente', async () => {
    const a = await render({ input: shot, settings: { seed: 7 }, scale: 1 })
    const b = await render({ input: shot, settings: { seed: 8 }, scale: 1 })
    expect(a.buffer.equals(b.buffer)).toBe(false)
  })
})

describe('render — erreurs', () => {
  it('nomme le fichier fautif quand il est introuvable', async () => {
    await expect(render({ input: '/introuvable/nulle-part.png' })).rejects.toThrow(
      /nulle-part\.png/,
    )
  })

  it('refuse `background: "image"` sans image de fond', async () => {
    await expect(
      render({ shots: [{ input: shot }], settings: { background: 'image' } }),
    ).rejects.toThrow(/background/)
  })
})

describe('render — annotations', () => {
  it('change le rendu quand un calque est ajouté', async () => {
    const plain = await render({ shots: [{ input: shot }], settings: { seed: 3 }, scale: 1 })
    const marked = await render({
      shots: [{ input: shot, layers: [{ kind: 'box', rect: { x: 0.2, y: 0.2, w: 0.3, h: 0.2 } }] }],
      settings: { seed: 3 },
      scale: 1,
    })
    expect(marked.buffer.equals(plain.buffer)).toBe(false)
  })

  it('ignore un calque masqué — il n’a rien à faire dans le fichier', async () => {
    const plain = await render({ shots: [{ input: shot }], settings: { seed: 3 }, scale: 1 })
    const hidden = await render({
      shots: [{
        input: shot,
        layers: [{ kind: 'box', hidden: true, rect: { x: 0.2, y: 0.2, w: 0.3, h: 0.2 } }],
      }],
      settings: { seed: 3 },
      scale: 1,
    })
    expect(hidden.buffer.equals(plain.buffer)).toBe(true)
  })
})

describe('render — centrage du texte', () => {
  type Box = { left: number; top: number; right: number; bottom: number }
  type Match = (r: number, g: number, b: number, x: number, y: number) => boolean

  async function pixels(buffer: Buffer) {
    const image = await loadImage(buffer)
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    return { data: ctx.getImageData(0, 0, image.width, image.height).data, width: image.width, height: image.height }
  }

  /** Boîte des pixels de `area` qui passent `match`. */
  function inkBox(image: Awaited<ReturnType<typeof pixels>>, area: Box, match: Match): Box {
    const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
    for (let y = area.top; y < area.bottom; y += 1) {
      for (let x = area.left; x < area.right; x += 1) {
        const i = (y * image.width + x) * 4
        if (!match(image.data[i], image.data[i + 1], image.data[i + 2], x, y)) continue
        box.left = Math.min(box.left, x)
        box.right = Math.max(box.right, x + 1)
        box.top = Math.min(box.top, y)
        box.bottom = Math.max(box.bottom, y + 1)
      }
    }
    return box
  }

  const center = (box: Box) => ({ x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 })

  it.each([1, 3])('centre l’encre du chiffre dans sa pastille à l’échelle %i', async (scale) => {
    const { buffer } = await render({
      shots: [{
        input: shot,
        layers: [{ kind: 'badge', color: '#FF00FF', size: 0.08, rect: { x: 0.4, y: 0.35, w: 0, h: 0 } }],
      }],
      settings: { format: 'png' },
      scale,
    })

    const image = await pixels(buffer)
    const whole = { left: 0, top: 0, right: image.width, bottom: image.height }
    const disc = inkBox(image, whole, (r, g, b) => r > 200 && g < 80 && b > 200)
    const middle = center(disc)
    // Le chiffre : ce qui, bien à l'intérieur du disque, n'est plus magenta.
    const reach = ((disc.right - disc.left) / 2) * 0.8
    const digit = center(
      inkBox(
        image,
        disc,
        (r, g, b, x, y) => Math.hypot(x + 0.5 - middle.x, y + 0.5 - middle.y) < reach && !(r > 128 && g < 128 && b > 128),
      ),
    )

    // Un pixel à l'échelle 1 : l'écart d'avant la correction en valait près de deux.
    expect(Math.abs(digit.x - middle.x)).toBeLessThan(scale)
    expect(Math.abs(digit.y - middle.y)).toBeLessThan(scale)
  }, 20_000)
})

describe('inspect', () => {
  it('rend le rapport du screenshot, barre de titre exclue', async () => {
    const result = await inspect(shot)
    expect(result.imageWidth).toBe(400)
    expect(result.imageHeight).toBe(300)
    expect(result.screen.h).toBeCloseTo(300 / 400, 3)
    expect(result.screen.y).toBeCloseTo(result.titleBar, 6)
  })

  it('n’annonce pas de barre de titre quand elle est masquée', async () => {
    const result = await inspect(shot, { titleBar: false })
    expect(result.titleBar).toBe(0)
    expect(result.screen.y).toBe(0)
  })
})

describe('inspect — cadres et recadrage', () => {
  it('donne à l’écran d’un Mac le rapport du screenshot, image entière visible', async () => {
    const result = await inspect(shot, { frame: 'macbook' })
    expect(result.screen.h / result.screen.w).toBeCloseTo(300 / 400, 3)
    expect(result.source.x).toBeCloseTo(0, 2)
    expect(result.source.w).toBeCloseTo(400, 2)
    expect(result.source.h).toBeCloseTo(300, 2)
  })

  it('publie la part visible du screenshot quand le ratio est verrouillé', async () => {
    const centered = await inspect(shot, { screenRatio: '1:1' })
    expect(centered.source).toEqual({ x: 50, y: 0, w: 300, h: 300 })

    const left = await inspect(shot, { screenRatio: '1:1' }, { x: 0, y: 0.5 })
    expect(left.source.x).toBe(0)
  })
})

describe('render — floutage et recadrage', () => {
  /** Moitié gauche rouge, moitié droite bleue. */
  function split(): Buffer {
    const canvas = createCanvas(400, 300)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(0, 0, 200, 300)
    ctx.fillStyle = '#0000ff'
    ctx.fillRect(200, 0, 200, 300)
    return canvas.toBuffer('image/png')
  }

  it('floute ce que l’écran montre, pas ce que l’image entière aurait montré', async () => {
    // Écran carré, image 4:3 poussée à droite : on voit les colonnes 100 à 400.
    // À 40 % de l'écran tombe la colonne 220, bleue. Un floutage qui relirait
    // l'image étirée y poserait la colonne 160, rouge — il cacherait autre chose
    // que ce qu'on voit, et laisserait croire que la donnée est couverte.
    const { buffer, width, height } = await render({
      shots: [{
        input: split(),
        pan: { x: 1, y: 0.5 },
        layers: [{ kind: 'redaction', redaction: 'pixel', rect: { x: 0, y: 0, w: 1, h: 1 } }],
      }],
      settings: { format: 'png', frame: 'none', ratio: '1:1', screenRatio: '1:1', padding: 0.1, shadow: 0 },
      scale: 1,
    })

    const image = await loadImage(buffer)
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    const [r, , b] = ctx.getImageData(Math.round(width * 0.42), Math.round(height / 2), 1, 1).data
    expect(b).toBeGreaterThan(200)
    expect(r).toBeLessThan(50)
  })
})

describe('render — cache du fond', () => {
  /** Chaque réglage qui touche au fond doit invalider le cache. Un champ oublié
   *  dans la clé fige le fond : le curseur bouge, l'image ne suit pas. */
  const variantes = {
    background: { background: 'gradient' },
    blur: { blur: 3 },
    shapes: { shapes: 9 },
    shapeOpacity: { shapeOpacity: 0.3 },
    saturation: { saturation: 0.4 },
    contrast: { contrast: 1.6 },
    grain: { grain: 0.9 },
    seed: { seed: 42 },
    palette: { palette: { base: '#101018', accents: ['#ff5500'] } },
    'tahoe-dark': { background: 'tahoe-dark' },
    'sonoma-light': { background: 'sonoma-light' },
    bayer: { background: 'bayer' },
    halftone: { background: 'halftone' },
    scanlines: { background: 'scanlines' },
  } as const

  const base = { seed: 5 } as const

  // La trame a ses propres réglages : ils ne valent que pour la série tramée.
  for (const background of SERIES.dither) {
    if (!isDither(background)) throw new Error(`${background} n’est pas une trame`)
    for (const [nom, patch] of Object.entries({ ditherCell: { ditherCell: 0.02 }, ditherAngle: { ditherAngle: 10 } })) {
      // Une trame alignée sur sa grille n'a pas d'angle à lire.
      if (nom === 'ditherAngle' && !DITHERS[background].angle) continue
      it(`invalide le cache quand \`${nom}\` change (${background})`, async () => {
        const plain = await render({ input: shot, settings: { ...base, background }, scale: 1 })
        const changed = await render({ input: shot, settings: { ...base, background, ...patch }, scale: 1 })
        expect(changed.buffer.equals(plain.buffer)).toBe(false)
      })
    }
  }

  it('rejoue le même fichier quand rien ne change', async () => {
    const a = await render({ input: shot, settings: base, scale: 1 })
    const b = await render({ input: shot, settings: base, scale: 1 })
    expect(a.buffer.equals(b.buffer)).toBe(true)
  })

  for (const [nom, patch] of Object.entries(variantes)) {
    it(`invalide le cache quand \`${nom}\` change`, async () => {
      const plain = await render({ input: shot, settings: base, scale: 1 })
      const changed = await render({ input: shot, settings: { ...base, ...patch }, scale: 1 })
      expect(changed.buffer.equals(plain.buffer)).toBe(false)
    })
  }

  it('ne rejoue pas le fond d’un autre screenshot', async () => {
    // La palette entre dans la clé : deux images de couleurs différentes ne
    // doivent pas partager leur fond.
    const other = fixture(400, 300)
    const green = createCanvas(400, 300)
    const ctx = green.getContext('2d')
    ctx.fillStyle = '#16a34a'
    ctx.fillRect(0, 0, 400, 300)

    const a = await render({ input: other, settings: base, scale: 1 })
    const b = await render({ input: green.toBuffer('image/png'), settings: base, scale: 1 })
    expect(a.buffer.equals(b.buffer)).toBe(false)
  })

  it('change de fond avec l’échelle, pas seulement de taille', async () => {
    const one = await render({ input: shot, settings: base, scale: 1 })
    const two = await render({ input: shot, settings: base, scale: 2 })
    expect(two.width).toBe(one.width * 2)
  })
})

describe('render — fonds d’écran', () => {
  it('embarque un fichier et une vignette par fond, sans alourdir le dépôt', async () => {
    expect(SERIES.windows).toHaveLength(6)
    for (const kind of WALLPAPERS) {
      const full = await stat(new URL(`../../public/${wallpaperPath(kind, 'full')}`, import.meta.url))
      const thumb = await stat(new URL(`../../public/${wallpaperPath(kind, 'thumb')}`, import.meta.url))
      expect(full.size, kind).toBeLessThanOrEqual(600 * 1024)
      expect(thumb.size, kind).toBeLessThanOrEqual(12 * 1024)
    }
  })

  it('recadre chaque fond en 16:10, vignette comprise', async () => {
    for (const kind of WALLPAPERS) {
      const full = await loadImage(await readFile(new URL(`../../public/${wallpaperPath(kind, 'full')}`, import.meta.url)))
      const thumb = await loadImage(await readFile(new URL(`../../public/${wallpaperPath(kind, 'thumb')}`, import.meta.url)))
      expect(full.width / full.height, kind).toBeCloseTo(1.6, 2)
      expect([thumb.width, thumb.height], kind).toEqual([192, 120])
    }
  })

  it('peint l’image du fond, pas l’aplat', async () => {
    const settings = { seed: 3, grain: 0 } as const
    const solid = await render({ input: shot, settings: { ...settings, background: 'solid' }, scale: 1 })
    const tahoe = await render({ input: shot, settings: { ...settings, background: 'tahoe-dark' }, scale: 1 })
    const again = await render({ input: shot, settings: { ...settings, background: 'tahoe-dark' }, scale: 1 })
    const sequoia = await render({ input: shot, settings: { ...settings, background: 'sequoia-light' }, scale: 1 })
    expect(tahoe.buffer.equals(solid.buffer)).toBe(false)
    expect(tahoe.buffer.equals(again.buffer)).toBe(true)
    expect(tahoe.buffer.equals(sequoia.buffer)).toBe(false)
    const bloom = await render({ input: shot, settings: { ...settings, background: 'windows-11-dark' }, scale: 1 })
    expect(bloom.buffer.equals(solid.buffer)).toBe(false)
    expect(bloom.buffer.equals(tahoe.buffer)).toBe(false)
  })
})

describe('render — série tramée', () => {
  it('compte onze trames, les trois d’origine en tête', () => {
    expect(SERIES.dither).toEqual([
      'bayer', 'halftone', 'scanlines',
      'atkinson', 'stipple', 'crosshatch', 'contours', 'ridgelines', 'riso', 'glyphs', 'truchet',
    ])
  })

  it('`atkinson` ne pose que deux couleurs : des cellules pleines, sans lissage', async () => {
    const { buffer } = await render({
      input: shot,
      // PNG : le WebP, avec pertes, inventerait des couleurs intermédiaires.
      settings: { background: 'atkinson', seed: 3, shadow: 0, ditherCell: 0.01, format: 'png' },
      scale: 1,
    })
    const image = await loadImage(buffer)
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    // Une bande du haut du canvas : du fond seul, la fenêtre commence plus bas.
    const { data } = ctx.getImageData(0, 0, image.width, 48)
    const colours = new Set<number>()
    for (let i = 0; i < data.length; i += 4) colours.add((data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!)
    expect(colours.size).toBe(2)
  })

  for (const background of SERIES.dither) {
    it(`\`${background}\` est déterministe par graine`, async () => {
      const a = await render({ input: shot, settings: { background, seed: 3, grain: 0 }, scale: 1 })
      const b = await render({ input: shot, settings: { background, seed: 3, grain: 0 }, scale: 1 })
      const c = await render({ input: shot, settings: { background, seed: 4, grain: 0 }, scale: 1 })
      expect(a.buffer.equals(b.buffer)).toBe(true)
      expect(a.buffer.equals(c.buffer)).toBe(false)
    })
  }
})
