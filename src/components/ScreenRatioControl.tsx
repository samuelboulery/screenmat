import { MonoLabel, Segmented, Tile, Toggle } from './ui.tsx'
import { m } from '../lib/i18n/index.ts'
import { DEVICE_RATIO_LABEL, SCREEN_RATIOS } from '../lib/screen.ts'
import type { IslandSide, Settings } from '../types.ts'

const SIDES: readonly IslandSide[] = ['left', 'right']

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
            {m.inspector.screen.deviceRatio} <span className="t-mono-micro text-dim">{DEVICE_RATIO_LABEL[device]}</span>
          </span>
          <Toggle
            checked={settings.deviceRatio}
            onChange={(deviceRatio) => onChange({ deviceRatio })}
            label={m.inspector.screen.keepDeviceRatio}
          />
        </div>
      ) : (
        <>
          <MonoLabel>{m.inspector.screen.screenRatio}</MonoLabel>
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
          <span className="t-ui text-ink-soft">{m.inspector.screen.island}</span>
          <Segmented
            options={SIDES.map((value) => ({ value, ...m.inspector.screen.sides[value] }))}
            value={settings.islandSide}
            onPick={(islandSide) => onChange({ islandSide })}
          />
        </div>
      )}
      {locked && <p className="t-mono-micro text-dim">{m.inspector.screen.panHint}</p>}
    </>
  )
}
