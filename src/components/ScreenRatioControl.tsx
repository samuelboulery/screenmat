import { MonoLabel, Segmented, Tile, Toggle } from './ui.tsx'
import { DEVICE_RATIO_LABEL, SCREEN_RATIOS } from '../lib/screen.ts'
import type { IslandSide, Settings } from '../types.ts'

const SIDES: Array<{ value: IslandSide; label: string; title: string }> = [
  { value: 'left', label: 'Left', title: 'Island on the left' },
  { value: 'right', label: 'Right', title: 'Island on the right' },
]

type ScreenRatioControlProps = {
  settings: Settings
  /** L'image de tête est paysage : un `phone` est alors couché. */
  landscape: boolean
  onChange: (patch: Partial<Settings>) => void
}

/**
 * Le ratio de l'écran d'un cadre. Un appareil n'en a qu'un, le sien : une
 * bascule. Un navigateur les a tous : une grille. Verrouillé, l'écran rogne le
 * screenshot, qui se replace alors à la main sur le canvas.
 */
export default function ScreenRatioControl({ settings, landscape, onChange }: ScreenRatioControlProps) {
  const device = settings.frame === 'macbook' || settings.frame === 'iphone' ? settings.frame : null
  const locked = device ? settings.deviceRatio : settings.screenRatio !== 'auto'

  return (
    <>
      {device ? (
        <div className="flex items-center justify-between">
          <span className="t-ui text-ink-soft">
            Device ratio <span className="t-mono-micro text-dim">{DEVICE_RATIO_LABEL[device]}</span>
          </span>
          <Toggle
            checked={settings.deviceRatio}
            onChange={(deviceRatio) => onChange({ deviceRatio })}
            label="Keep the device ratio"
          />
        </div>
      ) : (
        <>
          <MonoLabel>Screen ratio</MonoLabel>
          {/* Cinq ratios : une grille, comme celle du canvas. */}
          <div className="grid grid-cols-5 gap-1">
            {SCREEN_RATIOS.map((ratio) => (
              <Tile
                key={ratio}
                tone="raised"
                active={settings.screenRatio === ratio}
                onClick={() => onChange({ screenRatio: ratio })}
                className="h-8 font-mono text-[10px]"
              >
                {ratio}
              </Tile>
            ))}
          </div>
        </>
      )}
      {/* Debout, l'île est en haut : le réglage n'aurait rien à déplacer. */}
      {settings.frame === 'iphone' && landscape && (
        <div className="flex items-center justify-between">
          <span className="t-ui text-ink-soft">Island</span>
          <Segmented options={SIDES} value={settings.islandSide} onPick={(islandSide) => onChange({ islandSide })} />
        </div>
      )}
      {locked && <p className="t-mono-micro text-dim">Hold Space and drag to reposition the image.</p>}
    </>
  )
}
