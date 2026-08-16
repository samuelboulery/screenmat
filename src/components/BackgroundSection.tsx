import { ImageIcon, ShuffleIcon } from './icons.tsx'
import { DashedTile, MonoLabel, Section, Slider, Swatch } from './ui.tsx'
import type { BackgroundKind, Palette, Settings } from '../types.ts'

/* Le fond et ses formes : la moitié la plus longue de l'inspecteur, sortie du
   panneau pour le garder lisible. Aucune logique — des contrôles et un patch. */

const BACKGROUNDS: Array<{ value: BackgroundKind; label: string; preview: string }> = [
  { value: 'mesh', label: 'mesh', preview: 'radial-gradient(120% 120% at 20% 10%, #7DE2FF55, #A378FF33 45%, #14141B)' },
  { value: 'gradient', label: 'gradient', preview: 'linear-gradient(140deg, #7DE2FF66, #A378FF44)' },
  { value: 'solid', label: 'solid', preview: '#1B1B24' },
]

type BackgroundSectionProps = {
  settings: Settings
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
  return (
    <>
      <Section title="Background" collapsible open>
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

      <Section title="Shapes" collapsible>
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
  )
}
