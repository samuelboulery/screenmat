import { describe, expect, it } from 'vitest'
import { exportFilename, runBatch, slug } from '../export.ts'
import { DEFAULT_COMPOSITION, DEFAULT_SETTINGS } from '../../types.ts'

describe('slug', () => {
  it('nettoie une URL pour en faire un nom de fichier', () => {
    expect(slug('https://astonishing-lokum-03e021.netlify.app')).toBe(
      'astonishing-lokum-03e021-netlify-app',
    )
    expect(slug('miette-indol.vercel.app')).toBe('miette-indol-vercel-app')
  })

  it('retombe sur un nom par défaut quand l’URL est vide ou impraticable', () => {
    expect(slug('')).toBe('shotframe')
    expect(slug('   ')).toBe('shotframe')
    expect(slug('///')).toBe('shotframe')
  })

  it('borne la longueur', () => {
    expect(slug('a'.repeat(200)).length).toBe(48)
  })
})

describe('exportFilename', () => {
  it('porte l’échelle et l’extension du format choisi', () => {
    expect(exportFilename('miette-indol.vercel.app', 2, 'png')).toBe(
      'miette-indol-vercel-app-2x.png',
    )
    expect(exportFilename('miette-indol.vercel.app', 3, 'webp')).toBe(
      'miette-indol-vercel-app-3x.webp',
    )
    expect(exportFilename('', 1, 'webp')).toBe('shotframe-1x.webp')
  })
})

describe('runBatch', () => {
  /* Un monde canvas de façade : `renderScene` s'y exécute sans rien dessiner.
     Ce qui est testé, c'est l'ordonnancement des encodages, pas le rendu. */
  const noop = (): unknown =>
    new Proxy(function () {} as object, {
      get: (_target, key) => {
        // Le moteur mesure et concatène : il faut que la façade sache se
        // convertir en primitive, sinon la coercition jette.
        if (key === 'width' || key === 'height') return 0
        if (key === 'valueOf') return () => 0
        if (key === 'toString' || key === Symbol.toPrimitive) return () => ''
        if (typeof key === 'symbol') return undefined
        return noop()
      },
      apply: () => noop(),
      set: () => true,
    })

  function stubCanvas(delays: number[], format = 'png') {
    // Le moteur crée d'autres canvas que celui de l'export — la tuile de grain,
    // le fond mis en cache. Seuls ceux qu'on encode comptent, et comme les rendus
    // restent sérialisés, le n-ième encodage lancé est celui du n-ième item.
    let started = 0
    const encodes: number[] = []
    let running = 0
    let peak = 0

    const document = {
      createElement: () => {
        return {
          width: 0,
          height: 0,
          getContext: () => noop(),
          toBlob(callback: (blob: Blob | null) => void) {
            const index = started++
            running += 1
            peak = Math.max(peak, running)
            setTimeout(() => {
              running -= 1
              encodes.push(index)
              // Toujours du PNG, quel que soit le type demandé : c'est ce que
              // fait un navigateur sans encodeur WebP, et ce que `canvasToBlob`
              // doit refuser de livrer sous une extension `.webp`.
              callback(new Blob([new Uint8Array([index])], { type: 'image/png' }))
            }, delays[index] ?? 0)
          },
        }
      },
    }
    return { document, encodes, format, peak: () => peak }
  }

  const image = { naturalWidth: 400, naturalHeight: 300 }
  const palette = { base: '#20304a', accents: ['#7de2ff'] }

  const job = (index: number, format = 'png') => ({
    shotId: `s${index}`,
    name: `shot${index}`,
    ratio: 'auto' as const,
    scale: 1,
    scene: {
      shots: [{ id: `s${index}`, name: `shot${index}`, image, palette, layers: [] }],
      palette,
      settings: { ...DEFAULT_SETTINGS, format },
      composition: DEFAULT_COMPOSITION,
    },
  })

  async function withStubs<T>(delays: number[], run: () => Promise<T>) {
    const stub = stubCanvas(delays)
    const previous = globalThis.document
    Object.defineProperty(globalThis, 'document', { value: stub.document, configurable: true })
    try {
      return { result: await run(), ...stub }
    } finally {
      Object.defineProperty(globalThis, 'document', { value: previous, configurable: true })
    }
  }

  it('garde l’ordre de la file quand les encodages finissent à l’envers', async () => {
    // Délais décroissants : le dernier item finit le premier. C'est le cas qui
    // casse un `push` et que l'indexation rattrape.
    const jobs = [0, 1, 2].map((i) => job(i))
    const { encodes } = await withStubs([60, 30, 1], () => runBatch(jobs as never))
    expect(encodes[0]).not.toBe(0)
    expect([...encodes].sort()).toEqual([0, 1, 2])
  })

  it('ne mène pas plus de trois encodages de front', async () => {
    const jobs = [0, 1, 2, 3, 4, 5].map((i) => job(i))
    const { peak } = await withStubs([20, 20, 20, 20, 20, 20], () => runBatch(jobs as never))
    expect(peak()).toBeGreaterThan(1)
    expect(peak()).toBeLessThanOrEqual(3)
  })

  it('remonte l’erreur d’un encodage en vol', async () => {
    // `toBlob` rend un PNG là où la scène demandait du WebP : le garde-fou de
    // `canvasToBlob` doit jeter, et l'erreur ne doit pas se perdre.
    const jobs = [0, 1].map((i) => job(i, 'webp'))
    await expect(withStubs([0, 0], () => runBatch(jobs as never))).rejects.toThrow(/WEBP/)
  })
})
