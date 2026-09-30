import { useEffect, useRef } from 'react'
import { backgroundKey, paintBackground } from '../lib/background.ts'
import { useWallpaper } from '../hooks/useWallpaper.ts'
import { seriesOf } from '../lib/series.ts'
import type { BackgroundKind, Palette, Settings } from '../types.ts'

const WIDTH = 64
const HEIGHT = 40

/** Une vignette qui ne vient pas laisse la tuile sur l'aplat : le fond reste
 *  sélectionnable, et c'est son chargement en grand qui dira l'échec. */
const warn = (message: string) => console.warn('[background] vignette impossible', message)

type BackgroundThumbProps = {
  kind: BackgroundKind
  label: string
  palette: Palette
  settings: Settings
  active: boolean
  onPick: () => void
}

/**
 * Une variation de fond, dessinée par le moteur avec la palette et les réglages
 * courants : une vignette CSS mentirait dès la première couleur retouchée. Un
 * fond d'écran y passe aussi, avec sa vignette de 192 px plutôt que l'image
 * entière — vingt tuiles ne doivent pas coûter vingt fonds d'écran.
 */
export default function BackgroundThumb({ kind, label, palette, settings, active, onPick }: BackgroundThumbProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  // Repeindre sur la clé du cache de fond, pas sur `settings` : un curseur
  // d'ombre ou de rotation ne touche pas au fond, et en change l'objet.
  const image = useWallpaper(kind, 'thumb', warn) ?? undefined
  const key = backgroundKey({ width: WIDTH, height: HEIGHT }, palette, { ...settings, background: kind }, 1, image)

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.canvas.width = Math.round(WIDTH * dpr)
    ctx.canvas.height = Math.round(HEIGHT * dpr)
    // La trame réelle a des cellules plus petites qu'un pixel de vignette : on
    // la grossit pour que la variation se reconnaisse. Le flou du mesh se compte
    // en cellules, il se réduit d'autant, sans quoi la vignette serait un aplat.
    const ditherCell = Math.max(settings.ditherCell, 1 / 20)
    const blur = Math.max(1, Math.round((settings.blur * settings.ditherCell) / ditherCell))
    const thumb = seriesOf(kind) === 'dither' ? { ...settings, background: kind, ditherCell, blur } : { ...settings, background: kind }
    paintBackground(ctx, { width: ctx.canvas.width, height: ctx.canvas.height }, palette, thumb, dpr, image)
    // `key` résume tout ce que lit le fond, `kind` et l'image compris.
  }, [key])

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onPick}
      className={`h-10 overflow-hidden rounded-md border border-ink/10 ${active ? 'ring-selected' : ''}`}
    >
      <canvas ref={canvas} className="block size-full" />
    </button>
  )
}
