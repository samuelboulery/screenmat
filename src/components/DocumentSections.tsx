import BackgroundSection from './BackgroundSection.tsx'
import { FRAME_ICON, LAYOUT_ICON } from './icons.tsx'
import { MonoLabel, Section, Segmented, Slider, Tile, Toggle } from './ui.tsx'
import { DEFAULT_PLACEMENT } from '../types.ts'
import type {
  Composition,
  FrameStyle,
  LayoutKind,
  Palette,
  Placement,
  Ratio,
  Settings,
  Shot,
} from '../types.ts'

const FRAMES: Array<{ value: FrameStyle; label: string }> = [
  { value: 'none', label: 'none' },
  { value: 'browser', label: 'browser' },
  { value: 'macbook', label: 'mac' },
  { value: 'iphone', label: 'phone' },
]

/** Les ratios restent en mono : c'est une donnée, pas une action. */
const RATIOS: Ratio[] = ['4:3', '1:1', '16:9', '9:16', 'auto']

/** `side` s'appelle Grid : au-delà de deux shots il dispose une grille, et
 *  « Side » ne décrirait plus ce qu'on voit. La valeur, elle, ne bouge pas. */
const LAYOUTS: Array<{ value: LayoutKind; label: string }> = [
  { value: 'stack', label: 'Stack' },
  { value: 'side', label: 'Grid' },
  { value: 'tilt3d', label: 'Tilt 3D' },
]

/** Auto, puis les quatre largeurs de grille qui tiennent dans un canvas. */
const COLUMNS = ['0', '1', '2', '3', '4'] as const

export type DocumentSectionsProps = {
  settings: Settings
  composition: Composition
  palette: Palette
  /** Largeur d'une fenêtre à l'échelle 1 : sert à afficher l'élévation en px. */
  windowWidth: number
  /** Mode combiné : les images cochées forment une seule scène. */
  combined: boolean
  activeShot: Shot | null
  onChange: (patch: Partial<Settings>) => void
  onCompose: (patch: Partial<Composition>) => void
  onPlace: (shotId: string, patch: Partial<Placement>) => void
  onPickBackgroundImage: () => void
}

/**
 * Les réglages du document, montrés quand rien n'est sélectionné : ils valent
 * pour toutes les images. Le placement, lui, ne vaut que pour l'image active.
 */
export default function DocumentSections({
  settings,
  composition,
  palette,
  windowWidth,
  combined,
  activeShot,
  onChange,
  onCompose,
  onPlace,
  onPickBackgroundImage,
}: DocumentSectionsProps) {
  const { layout } = composition
  // En ratio `auto` le canvas épouse son contenu : une fenêtre agrandie ou
  // déplacée y produit exactement la même image.
  const placeable = settings.ratio !== 'auto' && activeShot !== null
  const placement = activeShot?.placement ?? DEFAULT_PLACEMENT

  return (
    <>
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
        {/* Un cadre d'appareil impose son propre rayon (`frameRadius`) : le
            régler ici ne produirait rien. */}
        {settings.frame !== 'macbook' && settings.frame !== 'iphone' && (
          <Slider
            label="Corners"
            value={settings.radius}
            display={`${(settings.radius * 100).toFixed(1)} %`}
            min={0}
            max={0.04}
            step={0.001}
            onInput={(radius) => onChange({ radius })}
          />
        )}
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

      {/* La barre de titre, son URL et son thème ne sont lus que par le cadre
          navigateur (`render.ts` et `chromeColors`) : ailleurs, la section
          entière ne décrit rien. */}
      {settings.frame === 'browser' && (
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
      )}

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
      </Section>

      <BackgroundSection
        settings={settings}
        palette={palette}
        onChange={onChange}
        onPickBackgroundImage={onPickBackgroundImage}
      />

      {/* Une seule source pour la disposition : les tuiles. La section n'existe
          qu'à partir de deux shots — à un seul, `layoutOffsets` retombe sur la
          fenêtre unique quoi qu'on choisisse. */}
      {combined && (
        <Section title="Composition" collapsible open>
          <div className="grid grid-cols-2 gap-1.5">
            {LAYOUTS.map((item) => {
              const Icon = LAYOUT_ICON[item.value]
              return (
                <Tile
                  key={item.value}
                  active={layout === item.value}
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
            // Même champ, mot juste : en grille il écarte les colonnes.
            label={layout === 'side' ? 'Gap' : 'Spread'}
            value={composition.spread}
            display={`${Math.round(composition.spread * 100)} %`}
            min={0}
            max={1}
            step={0.01}
            onInput={(spread) => onCompose({ spread })}
          />

          {layout === 'side' && (
            <div className="space-y-1.5">
              <MonoLabel>Columns</MonoLabel>
              <Segmented
                className="w-full"
                options={COLUMNS.map((value) => ({
                  value,
                  label: value === '0' ? 'auto' : value,
                }))}
                value={String(Math.min(4, composition.columns))}
                onPick={(value) => onCompose({ columns: Number(value) })}
              />
            </div>
          )}

          {layout === 'tilt3d' && (
            <Slider
              label="Converge"
              value={composition.converge}
              display={`${composition.converge}°`}
              min={0}
              max={16}
              step={1}
              onInput={(converge) => onCompose({ converge })}
            />
          )}

          {(layout === 'stack' || layout === 'tilt3d') && (
            <Slider
              label="Elevation"
              value={composition.elevation}
              display={`${Math.round(composition.elevation * windowWidth)} px`}
              min={0}
              max={0.12}
              step={0.002}
              onInput={(elevation) => onCompose({ elevation })}
            />
          )}

          {/* La composition est centrée sur sa boîte englobante ; ce curseur est
              la seule façon de la contredire. En ratio `auto` le canvas suit le
              contenu, donc il ne déplacerait rien. */}
          {settings.ratio !== 'auto' && (
            <Slider
              label="Offset Y"
              value={composition.offsetY}
              display={`${Math.round(composition.offsetY * windowWidth)} px`}
              min={-0.5}
              max={0.5}
              step={0.01}
              onInput={(offsetY) => onCompose({ offsetY })}
            />
          )}
        </Section>
      )}

      {/* Le shot actif, dans le canvas. Absent en ratio `auto` : le canvas y
          épouse son contenu, une fenêtre agrandie ou déplacée y produit
          exactement la même image. */}
      {placeable && activeShot && (
        <Section
          title="Shot"
          collapsible
          aside={<MonoLabel>{combined ? activeShot.name : '⌥-drag to move'}</MonoLabel>}
        >
          <Slider
            label="Size"
            value={placement.scale}
            display={`${Math.round(placement.scale * 100)} %`}
            min={0.2}
            max={2}
            step={0.01}
            onInput={(scale) => onPlace(activeShot.id, { scale })}
          />
          <Slider
            label="Offset X"
            value={placement.dx}
            display={`${Math.round(placement.dx * windowWidth)} px`}
            min={-1.5}
            max={1.5}
            step={0.01}
            onInput={(dx) => onPlace(activeShot.id, { dx })}
          />
          <Slider
            label="Offset Y"
            value={placement.dy}
            display={`${Math.round(placement.dy * windowWidth)} px`}
            min={-1.5}
            max={1.5}
            step={0.01}
            onInput={(dy) => onPlace(activeShot.id, { dy })}
          />
        </Section>
      )}

    </>
  )
}
