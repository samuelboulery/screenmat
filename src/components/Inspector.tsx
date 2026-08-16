import Presets from './Presets.tsx'
import { FRAME_ICON, ImageIcon, LAYOUT_ICON, ShuffleIcon } from './icons.tsx'
import type { ComposeTool } from './ToolRail.tsx'
import { DashedTile, MonoLabel, Panel, Section, Segmented, Slider, Swatch, Tile, Toggle } from './ui.tsx'
import type {
  BackgroundKind,
  Composition,
  FrameStyle,
  LayoutKind,
  Palette,
  Ratio,
  Settings,
  Style,
} from '../types.ts'

/** Exporté : l'écran Styles règle le même cadre, et la liste ne doit pas
 *  exister en double. */
export const FRAMES: Array<{ value: FrameStyle; label: string }> = [
  { value: 'browser', label: 'browser' },
  { value: 'macbook', label: 'mac' },
  { value: 'iphone', label: 'phone' },
  { value: 'none', label: 'none' },
]

/** Les ratios restent en mono : c'est une donnée, pas une action. */
const RATIOS: Ratio[] = ['4:3', '1:1', '16:9', '9:16', 'auto']

const LAYOUTS: Array<{ value: LayoutKind; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'stack', label: 'Stack' },
  { value: 'side', label: 'Side' },
  { value: 'tilt3d', label: 'Tilt 3D' },
]

const BACKGROUNDS: Array<{ value: BackgroundKind; label: string; preview: string }> = [
  { value: 'mesh', label: 'mesh', preview: 'radial-gradient(120% 120% at 20% 10%, #7DE2FF55, #A378FF33 45%, #14141B)' },
  { value: 'gradient', label: 'gradient', preview: 'linear-gradient(140deg, #7DE2FF66, #A378FF44)' },
  { value: 'solid', label: 'solid', preview: '#1B1B24' },
]

/** flat / tilt / stack — les trois profondeurs de la carte 1c. */
const DEPTHS = [
  { value: 'flat', label: 'flat' },
  { value: 'tilt', label: 'tilt' },
  { value: 'stack', label: 'stack' },
] as const

type Depth = (typeof DEPTHS)[number]['value']

type InspectorProps = {
  tool: ComposeTool
  settings: Settings
  composition: Composition
  palette: Palette
  styles: readonly Style[]
  activeStyleId: string | null
  /** Largeur d'une fenêtre à l'échelle 1 : sert à afficher l'élévation en px. */
  windowWidth: number
  onChange: (patch: Partial<Settings>) => void
  onCompose: (patch: Partial<Composition>) => void
  onApplyStyle: (id: string) => void
  onSaveStyle: () => void
  onUpdateStyle: () => void
  onPickBackgroundImage: () => void
  /** Docké (écrans de gestion) plutôt que flottant au-dessus du canvas. */
  docked?: boolean
  /** Descendu sous le bouton de la feuille rétractable, en mode étroit. */
  offset?: boolean
}

export default function Inspector({
  tool,
  settings,
  composition,
  palette,
  styles,
  activeStyleId,
  windowWidth,
  onChange,
  onCompose,
  onApplyStyle,
  onSaveStyle,
  onUpdateStyle,
  onPickBackgroundImage,
  docked = false,
  offset = false,
}: InspectorProps) {
  const depth: Depth =
    composition.layout === 'stack' ? 'stack' : settings.rotateY !== 0 ? 'tilt' : 'flat'

  const setDepth = (value: Depth) => {
    if (value === 'flat') {
      onChange({ rotateY: 0 })
      onCompose({ layout: 'single' })
    } else if (value === 'tilt') {
      onChange({ rotateY: -6 })
      onCompose({ layout: 'single' })
    } else {
      onChange({ rotateY: 0 })
      onCompose({ layout: 'stack' })
    }
  }

  return (
    <Panel
      className={
        docked
          ? 'w-[316px] shrink-0 space-y-4 rounded-none border-0 border-l border-white/5 p-6'
          : `absolute right-5 z-10 max-h-[calc(100%-190px)] w-72 space-y-4 overflow-y-auto p-4 ${offset ? 'top-[124px]' : 'top-[88px]'}`
      }
    >
      {tool === 'FRM' && (
        <>
          <Section title="Frame">
            <div className="grid grid-cols-4 gap-1">
              {FRAMES.map((frame) => {
                const Icon = FRAME_ICON[frame.value]
                return (
                  <Tile
                    key={frame.value}
                    active={settings.frame === frame.value}
                    onClick={() => onChange({ frame: frame.value })}
                    className="h-12 font-mono text-[10px]"
                  >
                    <Icon />
                    {frame.label}
                  </Tile>
                )
              })}
            </div>
          </Section>

          <Section title="Canvas">
            {/* Cinq ratios ne tiennent pas dans un groupe segmenté de 288 px :
                une grille garde des libellés lisibles sans repli sur deux lignes. */}
            <div className="grid grid-cols-5 gap-1">
              {RATIOS.map((ratio) => (
                <Tile
                  key={ratio}
                  tone="raised"
                  active={settings.ratio === ratio}
                  onClick={() => onChange({ ratio })}
                  className="h-8 font-mono text-[10px]"
                >
                  {ratio}
                </Tile>
              ))}
            </div>
            <Slider
              label="Padding"
              value={settings.padding}
              display={`${Math.round(settings.padding * 100)} %`}
              min={0}
              max={0.2}
              step={0.005}
              onInput={(padding) => onChange({ padding })}
            />
            <Slider
              label="Corners"
              value={settings.radius}
              display={`${(settings.radius * 100).toFixed(1)} %`}
              min={0}
              max={0.04}
              step={0.001}
              onInput={(radius) => onChange({ radius })}
            />
          </Section>
          <Presets
            styles={styles}
            activeStyleId={activeStyleId}
            onApplyStyle={onApplyStyle}
            onSaveStyle={onSaveStyle}
            onUpdateStyle={onUpdateStyle}
          />
        </>
      )}

      {tool === 'BG' && (
        <>
          <Section title="Background">
            <div className="grid grid-cols-4 gap-1.5">
              {BACKGROUNDS.map((preset) => (
                <Swatch
                  key={preset.value}
                  color={preset.preview}
                  title={preset.label}
                  active={settings.background === preset.value}
                  onClick={() => onChange({ background: preset.value })}
                />
              ))}
              <DashedTile
                onClick={onPickBackgroundImage}
                className={`size-10 ${settings.background === 'image' ? 'ring-selected' : ''}`}
                title="Use an image as background"
                aria-label="Use an image as background"
              >
                <ImageIcon />
              </DashedTile>
            </div>

            <div className="flex items-center justify-between">
              <MonoLabel>Seed {settings.seed}</MonoLabel>
              <button
                type="button"
                onClick={() => onChange({ seed: settings.seed + 1 })}
                className="t-ui-small flex items-center gap-1 text-accent hover:underline"
              >
                <ShuffleIcon />
                shuffle
              </button>
            </div>

            <div className="flex gap-1.5">
              <span
                title={palette.base}
                style={{ background: palette.base }}
                className="h-6 flex-1 rounded border border-white/10"
              />
              {palette.accents.map((color) => (
                <span
                  key={color}
                  title={color}
                  style={{ background: color }}
                  className="h-6 flex-1 rounded border border-white/10"
                />
              ))}
            </div>

            <Slider
              label="Saturation"
              value={settings.saturation}
              display={`${Math.round(settings.saturation * 100)} %`}
              min={0}
              max={2}
              step={0.05}
              onInput={(saturation) => onChange({ saturation })}
            />
            <Slider
              label="Contrast"
              value={settings.contrast}
              display={`${Math.round(settings.contrast * 100)} %`}
              min={0}
              max={2}
              step={0.05}
              onInput={(contrast) => onChange({ contrast })}
            />
          </Section>

          <Section title="Shapes">
            <Slider
              label="Count"
              value={settings.shapes}
              display={String(settings.shapes)}
              min={0}
              max={8}
              step={1}
              onInput={(shapes) => onChange({ shapes })}
            />
            <Slider
              label="Opacity"
              value={settings.shapeOpacity}
              display={`${Math.round(settings.shapeOpacity * 100)} %`}
              min={0}
              max={1}
              step={0.05}
              onInput={(shapeOpacity) => onChange({ shapeOpacity })}
            />
          </Section>
        </>
      )}

      {tool === '3D' && (
        <>
          <Section title="Depth">
            <div className="grid grid-cols-3 gap-1">
              {DEPTHS.map((item) => (
                <Tile
                  key={item.value}
                  active={depth === item.value}
                  onClick={() => setDepth(item.value)}
                  className="h-11 font-mono text-[10px]"
                >
                  {item.label}
                </Tile>
              ))}
            </div>
            <Slider
              label="Rotate Y"
              value={settings.rotateY}
              display={`${settings.rotateY}°`}
              min={-16}
              max={16}
              step={1}
              onInput={(rotateY) => onChange({ rotateY })}
            />
            <Slider
              label="Shadow"
              value={settings.shadow}
              display={settings.shadow < 0.6 ? 'soft' : settings.shadow > 1.3 ? 'hard' : 'medium'}
              min={0}
              max={2}
              step={0.1}
              onInput={(shadow) => onChange({ shadow })}
            />
          </Section>

          <Section title="Layout">
            <div className="grid grid-cols-2 gap-1.5">
              {LAYOUTS.map((item) => {
                const Icon = LAYOUT_ICON[item.value]
                return (
                  <Tile
                    key={item.value}
                    active={composition.layout === item.value}
                    onClick={() => onCompose({ layout: item.value })}
                    className="h-16 gap-1.5"
                  >
                    <Icon className="size-5" />
                    <span className="text-[10px]">{item.label}</span>
                  </Tile>
                )
              })}
            </div>
            <Slider
              label="Spread"
              value={composition.spread}
              display={`${Math.round(composition.spread * 100)} %`}
              min={0}
              max={1}
              step={0.01}
              onInput={(spread) => onCompose({ spread })}
            />
            <Slider
              label="Converge"
              value={composition.converge}
              display={`${composition.converge}°`}
              min={0}
              max={16}
              step={1}
              onInput={(converge) => onCompose({ converge })}
            />
            <Slider
              label="Elevation"
              value={composition.elevation}
              display={`${Math.round(composition.elevation * windowWidth)} px`}
              min={0}
              max={0.12}
              step={0.002}
              onInput={(elevation) => onCompose({ elevation })}
            />
          </Section>
        </>
      )}

      {tool === 'TXT' && (
        <Section title="Title bar">
          <div className="flex items-center justify-between">
            <span className="t-ui text-ink-soft">Show title bar</span>
            <Toggle
              checked={settings.titleBar}
              onChange={(titleBar) => onChange({ titleBar })}
              label="Show title bar"
            />
          </div>
          <input
            type="text"
            value={settings.url}
            onChange={(event) => onChange({ url: event.target.value })}
            placeholder="example.com"
            spellCheck={false}
            aria-label="URL shown in the title bar"
            className="w-full rounded-md border border-hairline bg-sunken px-3 py-2 font-mono text-[11px] text-ink placeholder:text-dim"
          />
          <Segmented
            className="w-full"
            options={[
              { value: 'auto', label: 'auto' },
              { value: 'light', label: 'light' },
              { value: 'dark', label: 'dark' },
            ]}
            value={settings.theme}
            onPick={(theme) => onChange({ theme })}
          />
        </Section>
      )}

      {tool === 'BLUR' && (
        <Section title="Blur & grain">
          <Slider
            label="Blur"
            value={settings.blur}
            display={`×${settings.blur}`}
            min={1}
            max={16}
            step={1}
            onInput={(blur) => onChange({ blur })}
          />
          <Slider
            label="Grain"
            value={settings.grain}
            display={`${Math.round(settings.grain * 100)} %`}
            min={0}
            max={1}
            step={0.05}
            onInput={(grain) => onChange({ grain })}
          />
          <Segmented
            className="w-full"
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'webp', label: 'WebP' },
            ]}
            value={settings.format}
            onPick={(format) => onChange({ format })}
          />
          <p className="t-ui-small text-dim">
            {settings.format === 'png'
              ? 'Lossless. Grain is noise — expect a heavy file.'
              : 'Quality 0.92 — visually identical, ~20× lighter.'}
          </p>
        </Section>
      )}
    </Panel>
  )
}
