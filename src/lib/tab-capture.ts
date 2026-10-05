/**
 * Capture d'un onglet par `getDisplayMedia` : l'utilisateur choisit l'onglet
 * dans la fenêtre de partage du navigateur, on en prend une seule image, et le
 * partage s'arrête aussitôt. Rien ne sort de la machine — l'image entre dans
 * l'éditeur par le même chemin qu'un coller.
 *
 * ponytail: la partie visible de l'onglet seulement. La page entière passe par
 * le CLI (`screenmat <url> --full-page`), ou plus tard par une extension.
 */
import { canvasToBlob } from './export.ts'

/** Ce que Chrome comprend en plus de `DisplayMediaStreamOptions`, et que le
 *  `lib.dom` de TypeScript ne décrit pas encore. Ignoré ailleurs. */
type TabCaptureOptions = DisplayMediaStreamOptions & {
  selfBrowserSurface?: 'include' | 'exclude'
  surfaceSwitching?: 'include' | 'exclude'
  monitorTypeSurfaces?: 'include' | 'exclude'
  controller?: FocusController
}

type FocusController = { setFocusBehavior?: (behavior: 'no-focus-change') => void }

type FocusControllerClass = new () => FocusController

export function canCaptureTab(devices: MediaDevices | undefined): boolean {
  return typeof devices?.getDisplayMedia === 'function'
}

/** Refermer la fenêtre de partage rejette en `NotAllowedError` : c'est un
 *  choix de l'utilisateur, pas une panne à lui signaler. */
export function isCancel(error: unknown): boolean {
  // Par le nom, pas par `instanceof DOMException` : une erreur venue d'un autre
  // realm n'en serait pas une instance.
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'NotAllowedError'
}

export function frameSize(width: number, height: number): { width: number; height: number } {
  if (width === 0 || height === 0) throw new Error('empty video frame')
  return { width, height }
}

/** Au-delà, une vidéo qui n'a toujours rien montré ne montrera rien. */
const FIRST_FRAME_TIMEOUT = 5000

/**
 * Attend que la vidéo ait une image à dessiner. Échoue si le partage s'arrête
 * avant — l'utilisateur l'a coupé depuis la barre du navigateur — ou au bout de
 * `timeout` : sans cela, la promesse resterait pendante, et le partage avec.
 *
 * Pas de `requestVideoFrameCallback` : il ne se déclenche jamais quand
 * l'onglet de screenmat est masqué, ce qui arrive dès que le navigateur bascule
 * vers l'onglet partagé. `HAVE_CURRENT_DATA` suffit à `drawImage`.
 */
export function firstFrame(video: HTMLVideoElement, track: MediaStreamTrack, timeout = FIRST_FRAME_TIMEOUT): Promise<void> {
  if (video.readyState >= 2 /* HAVE_CURRENT_DATA */) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => settle(new Error('no video frame')), timeout)
    const onData = () => settle()
    const onEnded = () => settle(new Error('sharing stopped'))
    function settle(error?: Error) {
      clearTimeout(timer)
      video.removeEventListener('loadeddata', onData)
      track.removeEventListener('ended', onEnded)
      if (error) reject(error)
      else resolve()
    }
    video.addEventListener('loadeddata', onData)
    track.addEventListener('ended', onEnded)
  })
}

/**
 * Une image de la vidéo, au pixel près de ce que le navigateur transmet.
 *
 * ponytail: la première image disponible. Un onglet qui vient de basculer peut
 * la livrer noire ; attendre une image « non vide » si ça se constate.
 */
async function grabFrame(stream: MediaStream): Promise<Blob> {
  const video = document.createElement('video')
  video.muted = true
  video.srcObject = stream
  try {
    await video.play()
    const [track] = stream.getVideoTracks()
    if (!track) throw new Error('no video track')
    await firstFrame(video, track)
    const { width, height } = frameSize(video.videoWidth, video.videoHeight)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d context unavailable')
    ctx.drawImage(video, 0, 0, width, height)
    return await canvasToBlob(canvas, 'png')
  } finally {
    video.srcObject = null
  }
}

/** Le focus reste sur screenmat plutôt que de sauter vers l'onglet partagé —
 *  là où le navigateur sait le faire. */
function focusController(): FocusController | undefined {
  const Controller = (globalThis as { CaptureController?: FocusControllerClass }).CaptureController
  return Controller ? new Controller() : undefined
}

/** À appeler aussitôt `getDisplayMedia` résolu, sinon le navigateur a déjà
 *  basculé. Purement cosmétique : un refus (`InvalidStateError` quand la
 *  surface n'est pas un onglet, ou trop tard) ne doit pas coûter la capture. */
function keepFocus(controller: FocusController | undefined): void {
  try {
    controller?.setFocusBehavior?.('no-focus-change')
  } catch {
    // Le focus bascule vers l'onglet partagé, comme sans `CaptureController`.
  }
}

/**
 * Ouvre la fenêtre de partage sur les onglets et rend un PNG de celui qui est
 * choisi. Une annulation rejette telle quelle — `isCancel` la reconnaît.
 * `devices` et `grab` ne varient que pour les tests.
 */
export async function captureTab(
  devices: MediaDevices = navigator.mediaDevices,
  grab: (stream: MediaStream) => Promise<Blob> = grabFrame,
): Promise<File> {
  const controller = focusController()
  const options: TabCaptureOptions = {
    video: { displaySurface: 'browser', width: { ideal: 3840 }, height: { ideal: 2160 } },
    audio: false,
    selfBrowserSurface: 'exclude',
    surfaceSwitching: 'exclude',
    monitorTypeSurfaces: 'exclude',
    ...(controller ? { controller } : {}),
  }
  const stream = await devices.getDisplayMedia(options)
  try {
    keepFocus(controller)
    return new File([await grab(stream)], 'tab-capture.png', { type: 'image/png' })
  } finally {
    for (const track of stream.getTracks()) track.stop()
  }
}
