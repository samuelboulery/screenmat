import BackgroundSection from './BackgroundSection.tsx'
import LayerInspector from './LayerInspector.tsx'
import Presets from './Presets.tsx'
import { FRAME_ICON, LAYOUT_ICON } from './icons.tsx'
import { Panel, Section, Segmented, Slider, Tile, Toggle } from './ui.tsx'
import type { NodePatch } from '../hooks/useShots.ts'
import type {
  Annotation,
  Composition,
  FrameStyle,
  LayoutKind,
  Palette,
  Ratio,
  Settings,
  Shot,
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

/** flat / tilt / stack — les trois profondeurs de la carte 1c. */
const DEPTHS = [
  { value: 'flat', label: 'flat' },
  { value: 'tilt', label: 'tilt' },
  { value: 'stack', label: 'stack' },
] as const

type Depth = (typeof DEPTHS)[number]['value']

type InspectorProps = {
  settings: Settings
  composition: Composition
  palette: Palette
  styles: readonly Style[]
  activeStyleId: string | null
  /** Largeur d'une fenêtre à l'échelle 1 : sert à afficher l'élévation en px. */
  windowWidth: number
  /* --- Sélection en cours : la moitié contextuelle du panneau. --- */
  activeShot: Shot | null
  selectedLayerIds: readonly string[]
  onSelectLayers: (ids: string[], additive: boolean, range: boolean) => void
  onPatchAnnotation: (shotId: string, id: string, patch: Partial<Annotation>) => void
  onPatchNode: (shotId: string, id: string, patch: NodePatch) => void
  onDeleteLayers: (shotId: string, ids: readonly string[]) => void
  onMoveLayer: (shotId: string, id: string, direction: 'up' | 'down') => void
  onMoveLayers: (
    shotId: string,
    ids: readonly string[],
    parentId: string | null,
    index: number,
  ) => void
  onGroupLayers: (shotId: string, ids: readonly string[]) => void
  onUngroupLayer: (shotId: string, groupId: string) => void
  /* --- Réglages du document. --- */
  onChange: (patch: Partial<Settings>) => void
  onCompose: (patch: Partial<Composition>) => void
  onApplyStyle: (id: string) => void
  onSaveStyle: () => void
  onUpdateStyle: () => void
  onPickBackgroundImage: () => void
  /** Descendu sous le bouton de la feuille rétractable, en mode étroit. */
  offset?: boolean
}

/**
 * Le panneau unique de l'écran Edit. En haut ce qui parle de la sélection —
 * calques et style du calque, présents seulement quand il y a de quoi en
 * parler ; en dessous les réglages du document, repliés par défaut sauf les
 * deux qu'on touche à chaque screenshot. Le rail gauche, lui, ne porte plus que
 * des instruments : une catégorie de réglages n'est pas un outil.
 */
export default function Inspector({
  settings,
  composition,
  palette,
  styles,
  activeStyleId,
  windowWidth,
  activeShot,
  selectedLayerIds,
  onSelectLayers,
  onPatchAnnotation,
  onPatchNode,
  onDeleteLayers,
  onMoveLayer,
  onMoveLayers,
  onGroupLayers,
  onUngroupLayer,
  onChange,
  onCompose,
  onApplyStyle,
  onSaveStyle,
  onUpdateStyle,
  onPickBackgroundImage,
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
      className={`absolute right-5 z-10 max-h-[calc(100%-190px)] w-72 space-y-4 overflow-y-auto p-4 ${offset ? 'top-[124px]' : 'top-[88px]'}`}
    >
      <LayerInspector
        shot={activeShot}
        selectedIds={selectedLayerIds}
        onSelect={onSelectLayers}
        onPatch={onPatchAnnotation}
        onPatchNode={onPatchNode}
        onDelete={onDeleteLayers}
        onMove={onMoveLayer}
        onMoveTo={onMoveLayers}
        onGroup={onGroupLayers}
        onUngroup={onUngroupLayer}
      />

      <Section title="Frame" collapsible open>
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

      <Section title="Canvas" collapsible>
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

      <BackgroundSection
        settings={settings}
        palette={palette}
        onChange={onChange}
        onPickBackgroundImage={onPickBackgroundImage}
      />

      <Section title="Depth" collapsible>
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

      <Section title="Layout" collapsible>
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

      <Section title="Title bar" collapsible>
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

      <Section title="Blur & grain" collapsible>
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

      <Presets
        styles={styles}
        activeStyleId={activeStyleId}
        onApplyStyle={onApplyStyle}
        onSaveStyle={onSaveStyle}
        onUpdateStyle={onUpdateStyle}
      />
    </Panel>
  )
}
