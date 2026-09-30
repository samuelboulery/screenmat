import BackgroundPalette from './BackgroundPalette.tsx'
import BackgroundThumb from './BackgroundThumb.tsx'
import { ImageIcon, ShuffleIcon } from './icons.tsx'
import { DashedTile, MonoLabel, Section, Segmented, Slider } from './ui.tsx'
import { DITHERS, isDither } from '../lib/dithered.ts'
import { SERIES, seriesOf, type Series } from '../lib/series.ts'
import { isWallpaper } from '../lib/wallpapers.ts'
import type { Palette, Settings } from '../types.ts'

/* Le fond et ses formes : la moitié la plus longue de l'inspecteur, sortie du
   panneau pour le garder lisible. Aucune logique — des contrôles, un patch, et
   la seule règle qui vaille ici : un réglage que le fond choisi ne lit pas ne
   s'affiche pas. `paintBackground` (`lib/background.ts`) dit lequel lit quoi. */

const SERIES_OPTIONS: ReadonlyArray<{ value: Series; label: string; title: string }> = [
  { value: 'screenshot', label: 'Screenshot', title: 'Backgrounds drawn from the screenshot colours' },
  { value: 'dither', label: 'Dither', title: 'Two-tone dithered backgrounds' },
  { value: 'macos', label: 'macOS', title: 'The macOS wallpapers, Big Sur to Golden Gate' },
  { value: 'windows', label: 'Windows', title: 'The Windows wallpapers, XP to 11' },
]

type BackgroundSectionProps = {
  settings: Settings
  /** Celle de la capture ; `settings.palette`, si elle existe, la remplace. */
  palette: Palette
  onChange: (patch: Partial<Settings>) => void
  onPickBackgroundImage: () => void
}

export default function BackgroundSection({
  settings,
  palette,
  onChange,
  onPickBackgroundImage,
}: BackgroundSectionProps) {
  const kind = settings.background
  // Une image n'appartient à aucune série : l'onglet reste sur la première,
  // et en choisir un applique sa première variation.
  const series = seriesOf(kind) ?? 'screenshot'
  const colors = settings.palette ?? palette
  // Une image — perso ou fond d'écran — couvre l'aplat : ni couleur, ni graine,
  // ni saturation n'y changent rien. Le grain ne se pose que sur l'image perso :
  // un fond d'écran se montre tel qu'il est sur un bureau.
  const wallpaper = isWallpaper(kind)
  const picture = kind === 'image' || wallpaper

  return (
    <>
      <Section title="Background" collapsible open>
        <Segmented
          options={SERIES_OPTIONS}
          value={series}
          onPick={(next) => onChange({ background: SERIES[next][0] })}
          // Quatre séries ne tiennent pas sur une ligne de l'inspecteur : deux par deux.
          className="grid! w-full grid-cols-2"
        />
        <div className="grid grid-cols-5 gap-1.5">
          {SERIES[series].map((variant) => (
            <BackgroundThumb
              key={variant}
              kind={variant}
              label={variant}
              palette={colors}
              settings={settings}
              active={kind === variant}
              onPick={() => onChange({ background: variant })}
            />
          ))}
          <DashedTile
            onClick={onPickBackgroundImage}
            className={`h-10 ${kind === 'image' ? 'ring-selected' : ''}`}
            title="Use an image as background"
            aria-label="Use an image as background"
          >
            <ImageIcon />
          </DashedTile>
        </div>

        {/* Seuls un aplat et une image n'ont rien à tirer au sort. */}
        {kind !== 'solid' && !picture && (
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
        )}

        {!picture && (
          <BackgroundPalette
            palette={colors}
            frozen={Boolean(settings.palette)}
            onChange={(next) => onChange({ palette: next })}
          />
        )}

        {series === 'dither' && !picture && <DitherSliders settings={settings} onChange={onChange} />}

        {/* Une image de fond couvre l'aplat : la graduer ne se verrait pas. Une
            trame n'a que deux tons, poussés aux extrêmes : la saturation n'y
            change presque rien. */}
        {!picture && series !== 'dither' && (
          <Percent label="Saturation" value={settings.saturation} max={2} onInput={(saturation) => onChange({ saturation })} />
        )}
        {!picture && (
          <Percent label="Contrast" value={settings.contrast} max={2} onInput={(contrast) => onChange({ contrast })} />
        )}
        {/* Le grain empêche un aplat de ressembler à du vide ; sur une trame, il
            brouillerait ce qu'elle a de net, et le moteur ne le dessine pas. */}
        {(series !== 'dither' && !wallpaper) || kind === 'image' ? (
          <Percent label="Grain" value={settings.grain} max={1} onInput={(grain) => onChange({ grain })} />
        ) : null}
      </Section>

      {(kind === 'mesh' || kind === 'gradient' || seriesOf(kind) === 'dither') && (
        <ShapesSection settings={settings} onChange={onChange} />
      )}
    </>
  )
}

type SlidersProps = { settings: Settings; onChange: (patch: Partial<Settings>) => void }

function Percent({ label, value, max, onInput }: { label: string; value: number; max: number; onInput: (value: number) => void }) {
  return (
    <Slider label={label} value={value} display={`${Math.round(value * 100)} %`} min={0} max={max} step={0.05} onInput={onInput} />
  )
}

/** La trame : taille de cellule, en part de la largeur, et angle du réseau —
 *  pour celles qui en ont un : `DITHERS` dit lesquelles sont alignées sur leur
 *  grille. */
function DitherSliders({ settings, onChange }: SlidersProps) {
  return (
    <>
      <Slider
        label="Cell size"
        value={settings.ditherCell}
        display={`${(settings.ditherCell * 100).toFixed(1)} %`}
        min={0.002}
        max={0.03}
        step={0.001}
        onInput={(ditherCell) => onChange({ ditherCell })}
      />
      {isDither(settings.background) && DITHERS[settings.background].angle && (
        <Slider
          label="Angle"
          value={settings.ditherAngle}
          display={`${settings.ditherAngle}°`}
          min={0}
          max={90}
          step={1}
          onInput={(ditherAngle) => onChange({ ditherAngle })}
        />
      )}
    </>
  )
}

/** Les taches du mesh, qu'une trame reprend sous elle. Le dégradé n'a que leur
 *  opacité ; le nombre et le flou n'existent que là où elles sont peintes. */
function ShapesSection({ settings, onChange }: SlidersProps) {
  const blobs = settings.background !== 'gradient'
  return (
    <Section title="Shapes" collapsible>
      {blobs && (
        <Slider
          label="Count"
          value={settings.shapes}
          display={String(settings.shapes)}
          min={0}
          max={8}
          step={1}
          onInput={(shapes) => onChange({ shapes })}
        />
      )}
      {/* Sous une trame, les taches sont peintes pleines : c'est le seuil qui
          décide du ton, une opacité n'y changerait rien. */}
      {seriesOf(settings.background) !== 'dither' && (
        <Percent label="Opacity" value={settings.shapeOpacity} max={1} onInput={(shapeOpacity) => onChange({ shapeOpacity })} />
      )}
      {blobs && (
        <Slider
          label="Blur"
          value={settings.blur}
          display={`×${settings.blur}`}
          min={1}
          max={16}
          step={1}
          onInput={(blur) => onChange({ blur })}
        />
      )}
    </Section>
  )
}
