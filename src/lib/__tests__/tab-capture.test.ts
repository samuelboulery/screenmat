import { afterEach, describe, expect, it } from 'vitest'
import { canCaptureTab, captureTab, firstFrame, frameSize, isCancel } from '../tab-capture.ts'

/* `getDisplayMedia` exige un vrai clic dans la fenêtre de partage : ce qui se
   teste ici, c'est ce qui entoure l'appel — la détection, l'arrêt du partage
   quoi qu'il arrive, et la frontière entre une annulation et une panne. */

function fakeStream() {
  const track = { stopped: false, stop() { this.stopped = true } }
  return { track, stream: { getTracks: () => [track] } as unknown as MediaStream }
}

function devices(stream: MediaStream | Error) {
  return {
    getDisplayMedia: () => (stream instanceof Error ? Promise.reject(stream) : Promise.resolve(stream)),
  } as unknown as MediaDevices
}

describe('canCaptureTab', () => {
  it('suit la présence de getDisplayMedia', () => {
    expect(canCaptureTab(devices(new Error()))).toBe(true)
    expect(canCaptureTab(undefined)).toBe(false)
    expect(canCaptureTab({} as MediaDevices)).toBe(false)
  })
})

describe('isCancel', () => {
  it('reconnaît la fenêtre de partage refermée', () => {
    expect(isCancel(new DOMException('Permission denied', 'NotAllowedError'))).toBe(true)
  })

  it('se fie au nom, pas à la classe — une erreur d’un autre realm compte aussi', () => {
    expect(isCancel({ name: 'NotAllowedError', message: 'denied' })).toBe(true)
  })

  it('laisse passer les vraies pannes', () => {
    expect(isCancel(new DOMException('No source', 'NotFoundError'))).toBe(false)
    expect(isCancel(new Error('boom'))).toBe(false)
  })
})

describe('frameSize', () => {
  it('garde la taille de la vidéo', () => {
    expect(frameSize(2880, 1800)).toEqual({ width: 2880, height: 1800 })
  })

  it('refuse une vidéo sans image', () => {
    expect(() => frameSize(0, 0)).toThrow()
  })
})

describe('firstFrame', () => {
  const video = (readyState: number) => Object.assign(new EventTarget(), { readyState }) as unknown as HTMLVideoElement
  const track = () => new EventTarget() as unknown as MediaStreamTrack

  it('résout tout de suite quand une image est déjà là', async () => {
    await expect(firstFrame(video(2), track(), 1000)).resolves.toBeUndefined()
  })

  it('attend loadeddata', async () => {
    const element = video(0)
    const waiting = firstFrame(element, track(), 1000)
    element.dispatchEvent(new Event('loadeddata'))
    await expect(waiting).resolves.toBeUndefined()
  })

  it('échoue quand le partage s’arrête avant la première image', async () => {
    const source = track()
    const waiting = firstFrame(video(0), source, 1000)
    source.dispatchEvent(new Event('ended'))
    await expect(waiting).rejects.toThrow()
  })

  it('échoue au bout du délai plutôt que d’attendre pour toujours', async () => {
    await expect(firstFrame(video(0), track(), 10)).rejects.toThrow()
  })
})

describe('captureTab', () => {
  afterEach(() => {
    delete (globalThis as { CaptureController?: unknown }).CaptureController
  })

  it('rend un PNG nommé et coupe le partage', async () => {
    const { track, stream } = fakeStream()
    const png = new Blob(['png'], { type: 'image/png' })
    const file = await captureTab(devices(stream), async () => png)
    expect(file.name).toBe('tab-capture.png')
    expect(file.type).toBe('image/png')
    expect(track.stopped).toBe(true)
  })

  it('coupe le partage même quand la capture échoue', async () => {
    const { track, stream } = fakeStream()
    await expect(
      captureTab(devices(stream), async () => {
        throw new Error('pas d’image')
      }),
    ).rejects.toThrow('pas d’image')
    expect(track.stopped).toBe(true)
  })

  it('coupe le partage même quand le réglage du focus jette', async () => {
    ;(globalThis as { CaptureController?: unknown }).CaptureController = class {
      setFocusBehavior() {
        throw new DOMException('too late', 'InvalidStateError')
      }
    }
    const { track, stream } = fakeStream()
    await captureTab(devices(stream), async () => new Blob(['png'], { type: 'image/png' })).catch(() => undefined)
    expect(track.stopped).toBe(true)
  })

  it('transmet l’annulation telle quelle', async () => {
    const cancel = new DOMException('Permission denied', 'NotAllowedError')
    await expect(captureTab(devices(cancel), async () => new Blob())).rejects.toBe(cancel)
  })
})
