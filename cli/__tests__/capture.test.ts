import { afterAll, describe, expect, it } from 'vitest'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import type { ExecFileException } from 'node:child_process'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
// `api.ts` installe le shim DOM : l'importer ici, c'est vérifier que la capture
// survit au `document` qui jette — c'est ce qui la fait tourner dans un
// processus à part.
import * as api from '../api.ts'
import {
  addressText,
  capture,
  captureFlags,
  captureName,
  captureTarget,
  explainFailure,
  fullPageHeight,
  MAX_PIXELS,
  parseCaptureOptions,
} from '../capture.ts'

it('est exportée par l’API Node', () => {
  expect((api as Record<string, unknown>).capture).toBe(capture)
})

describe('parseCaptureOptions', () => {
  it('pose les défauts', () => {
    expect(parseCaptureOptions(undefined)).toEqual({
      width: 1440,
      height: 900,
      density: 2,
      fullPage: false,
      colorScheme: 'light',
    })
  })

  it('garde les valeurs valides', () => {
    const options = parseCaptureOptions({ width: 800, density: 1.5, fullPage: true, colorScheme: 'dark', waitFor: '#app' })
    expect(options).toMatchObject({ width: 800, density: 1.5, fullPage: true, colorScheme: 'dark', waitFor: '#app' })
    expect(parseCaptureOptions({ waitFor: 500 }).waitFor).toBe(500)
  })

  it('lit un waitFor fait de chiffres comme des millisecondes', () => {
    // Sinon `"500"` deviendrait le sélecteur `500`, attendu 30 s pour rien.
    expect(parseCaptureOptions({ waitFor: '500' }).waitFor).toBe(500)
    expect(() => parseCaptureOptions({ waitFor: '40000' })).toThrow('`waitFor`')
  })

  it.each([
    [{ width: 100 }, 'width'],
    [{ width: 1440.5 }, 'width'],
    [{ height: 5000 }, 'height'],
    [{ density: 4 }, 'density'],
    [{ waitFor: -1 }, 'waitFor'],
    [{ waitFor: 40_000 }, 'waitFor'],
    [{ waitFor: '' }, 'waitFor'],
    [{ colorScheme: 'sepia' }, 'colorScheme'],
    [{ fullPage: 'oui' }, 'fullPage'],
  ])('refuse %j en nommant le champ', (raw, field) => {
    expect(() => parseCaptureOptions(raw)).toThrow(`\`${field}\``)
  })

  it('refuse autre chose qu’un objet', () => {
    expect(() => parseCaptureOptions('large')).toThrow()
  })
})

describe('captureTarget', () => {
  it('accepte http et https', () => {
    expect(captureTarget('https://example.com').hostname).toBe('example.com')
    expect(captureTarget('http://localhost:5173/').port).toBe('5173')
  })

  it('refuse une URL de plus de 2048 caractères', () => {
    expect(() => captureTarget(`https://example.com/${'a'.repeat(2048)}`)).toThrow('`url`')
  })

  it.each(['file:///etc/passwd', 'javascript:alert(1)', 'ftp://example.com', 'pas une url', ''])(
    'refuse « %s »',
    (url) => {
      expect(() => captureTarget(url)).toThrow(/http/)
    },
  )
})

describe('addressText', () => {
  it('garde l’hôte et le chemin, sans schéma ni requête', () => {
    expect(addressText(new URL('https://example.com/'))).toBe('example.com')
    expect(addressText(new URL('http://localhost:5173/app?x=1#top'))).toBe('localhost:5173/app')
  })

  it('tient sous 200 caractères', () => {
    expect(addressText(new URL(`https://example.com/${'a'.repeat(300)}`))).toHaveLength(200)
  })
})

describe('captureName', () => {
  it('fait un nom de fichier de l’hôte et du chemin', () => {
    expect(captureName(new URL('https://example.com/pricing'))).toBe('example-com-pricing')
    expect(captureName(new URL('http://localhost:5173/'))).toBe('localhost-5173')
  })

  it('tient sous 48 caractères', () => {
    expect(captureName(new URL(`https://example.com/${'a'.repeat(100)}`)).length).toBeLessThanOrEqual(48)
  })
})

describe('captureFlags', () => {
  it('ne rend rien sans flag de capture', () => {
    expect(captureFlags({})).toEqual({ options: {}, given: [] })
  })

  it('traduit les flags du CLI', () => {
    const { options, given } = captureFlags({
      viewport: '1280x720',
      density: '1',
      'full-page': true,
      'color-scheme': 'dark',
      wait: '#app',
    })
    expect(options).toEqual({ width: 1280, height: 720, density: 1, fullPage: true, colorScheme: 'dark', waitFor: '#app' })
    expect(given).toEqual(['--viewport', '--density', '--full-page', '--color-scheme', '--wait'])
  })

  it('refuse un --viewport mal formé', () => {
    expect(() => captureFlags({ viewport: '1280' })).toThrow('`--viewport`')
  })
})

describe('fullPageHeight', () => {
  it('garde la hauteur de la page tant qu’elle tient sous le plafond', () => {
    expect(fullPageHeight(3000, { width: 1440, density: 2 })).toBe(3000)
  })

  it('coupe une page infinie pour rester sous MAX_PIXELS', () => {
    const height = fullPageHeight(1_000_000, { width: 1440, density: 2 })
    expect(height).toBeLessThan(1_000_000)
    expect(1440 * 2 * height * 2).toBeLessThanOrEqual(MAX_PIXELS)
  })
})

describe('explainFailure', () => {
  const failure = (fields: Partial<ExecFileException>): ExecFileException =>
    Object.assign(new Error('Command failed: node capture-child.ts {…}'), fields) as ExecFileException

  it('garde la dernière ligne de stderr, pas un avertissement de Node', () => {
    const stderr = '(node:1) ExperimentalWarning: Type Stripping\nnet::ERR_CONNECTION_REFUSED\n'
    expect(explainFailure(failure({ code: 1 }), stderr)).toBe('net::ERR_CONNECTION_REFUSED')
  })

  it('dit qu’un processus tué a dépassé son délai', () => {
    expect(explainFailure(failure({ killed: true, signal: 'SIGTERM' }), '')).toMatch(/délai/)
  })

  it('dit qu’une capture trop lourde a été abandonnée', () => {
    expect(explainFailure(failure({ code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' }), '')).toMatch(/trop lourde/)
  })

  it('ne recopie jamais la ligne de commande', () => {
    expect(explainFailure(failure({ code: 1 }), '')).not.toMatch(/Command failed/)
  })
})

/* Le navigateur, pour de vrai. Les pages viennent d'un serveur local : aucun
   test ne sort de la machine. */

const PAGES: Record<string, string> = {
  '/plain': '<body style="margin:0;background:#00ff00"></body>',
  '/tall': '<body style="margin:0"><div style="height:3000px;background:#00ff00"></div></body>',
  '/scheme':
    '<style>body{margin:0;background:#fff}@media (prefers-color-scheme: dark){body{background:#000}}</style><body></body>',
  '/late':
    '<body style="margin:0;background:#fff"><script>setTimeout(()=>{const d=document.createElement("div");d.id="late";d.style.cssText="position:fixed;inset:0;background:#f00";document.body.append(d)},300)</script></body>',
}

const server = createServer((request, response) => {
  const page = PAGES[request.url ?? '']
  response.writeHead(page ? 200 : 404, { 'content-type': 'text/html' })
  response.end(page ?? '')
})
await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
afterAll(() => server.close())

const SMALL = { width: 400, height: 300, density: 1 }

/** Seuls un navigateur ou `playwright-core` absents sautent le bloc, et en
 *  local seulement : toute autre panne — un processus enfant cassé — doit
 *  rester rouge. */
const MISSING = /aucun navigateur trouvé|n’est pas installé/
const unavailable = await capture(`${origin}/plain`, SMALL).then(
  () => undefined,
  (error: Error) => (MISSING.test(error.message) ? error.message : Promise.reject(error)),
)

it('trouve un navigateur en CI', () => {
  // Un test qui ne tourne jamais finit par mentir : la CI l'exige.
  if (process.env.CI) expect(unavailable).toBeUndefined()
})

async function pixel(png: Buffer, x: number, y: number): Promise<number[]> {
  const image = await loadImage(png)
  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0)
  return Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3))
}

describe.skipIf(unavailable !== undefined)('capture — navigateur', () => {
  it('rend un PNG de viewport × densité', async () => {
    const image = await loadImage(await capture(`${origin}/plain`, { ...SMALL, density: 2 }))
    expect([image.width, image.height]).toEqual([800, 600])
  })

  it('capture toute la hauteur avec fullPage', async () => {
    const image = await loadImage(await capture(`${origin}/tall`, { ...SMALL, fullPage: true }))
    expect(image.height).toBe(3000)
  })

  it('suit colorScheme', async () => {
    expect(await pixel(await capture(`${origin}/scheme`, SMALL), 10, 10)).toEqual([255, 255, 255])
    expect(await pixel(await capture(`${origin}/scheme`, { ...SMALL, colorScheme: 'dark' }), 10, 10)).toEqual([0, 0, 0])
  })

  it('attend le sélecteur demandé', async () => {
    expect(await pixel(await capture(`${origin}/late`, { ...SMALL, waitFor: '#late' }), 10, 10)).toEqual([255, 0, 0])
  })

  it('nomme l’URL et la cause quand la page ne répond pas', async () => {
    const closed = createServer()
    await new Promise<void>((done) => closed.listen(0, '127.0.0.1', done))
    const url = `http://127.0.0.1:${(closed.address() as AddressInfo).port}/`
    await new Promise((done) => closed.close(done))
    await expect(capture(url, SMALL)).rejects.toThrow(new RegExp(`${url}.*ERR_CONNECTION_REFUSED`))
  })

  it('passe à render sans fichier intermédiaire', async () => {
    const result = await api.render({ input: await capture(`${origin}/plain`, SMALL), settings: { frame: 'browser' }, scale: 1 })
    expect(result.buffer.length).toBeGreaterThan(0)
  })
}, 60_000)
