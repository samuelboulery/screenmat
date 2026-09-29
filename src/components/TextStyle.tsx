import ColorPicker from './ColorPicker.tsx'
import { Section, Segmented, Slider, Toggle, type Option } from './ui.tsx'
import { ANNOTATION_LIMITS } from '../lib/annotate.ts'
import type { Annotation, TextAlign, TextBackground, TextFont } from '../types.ts'

const FONTS: ReadonlyArray<Option<TextFont>> = [
  { value: 'sans', label: 'Sans' },
  { value: 'mono', label: 'Mono' },
]

/** Une graisse est une donnée : en chiffres et en mono, le nom complet en
 *  infobulle. Quatre mots n'auraient pas tenu dans 288 px. */
const WEIGHTS: ReadonlyArray<Option<string>> = [
  { value: '400', label: <span className="font-mono">400</span>, title: 'Regular' },
  { value: '500', label: <span className="font-mono">500</span>, title: 'Medium' },
  { value: '600', label: <span className="font-mono">600</span>, title: 'Semibold' },
  { value: '700', label: <span className="font-mono">700</span>, title: 'Bold' },
]

const ALIGNS: ReadonlyArray<Option<TextAlign>> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

/** Plaques proposées d'office : noire, blanche, puis celles de la palette. */
const PLATE_COLORS = ['#000000', '#FFFFFF', '#111111', '#FFD479']

type TextStyleProps = {
  annotation: Annotation
  accents: readonly string[]
  onPatch: (patch: Partial<Annotation>) => void
}

/** Pourcentage lisible pour une fraction de la largeur de la fenêtre. */
function percent(value: number): string {
  return `${(value * 100).toFixed(2)} %`
}

/** Réglages d'un calque texte : le texte lui-même, puis sa plaque. */
export default function TextStyle({ annotation, accents, onPatch }: TextStyleProps) {
  const plate = annotation.background
  const patchPlate = (patch: Partial<TextBackground>) => onPatch({ background: { ...plate, ...patch } })

  return (
    <>
      <Section title="Text">
        <textarea
          value={annotation.text}
          rows={Math.min(6, Math.max(2, annotation.text.split('\n').length))}
          onChange={(event) => onPatch({ text: event.target.value })}
          aria-label="Text"
          className="w-full resize-none rounded-md border border-hairline bg-sunken px-3 py-2 text-[12px] text-ink placeholder:text-dim"
        />
        <Segmented className="w-full" options={FONTS} value={annotation.font} onPick={(font) => onPatch({ font })} />
        <Segmented
          className="w-full"
          options={WEIGHTS}
          value={String(annotation.weight)}
          onPick={(weight) => onPatch({ weight: Number(weight) })}
        />
        <Segmented className="w-full" options={ALIGNS} value={annotation.align} onPick={(align) => onPatch({ align })} />
        <Slider
          label="Size"
          value={annotation.size}
          display={percent(annotation.size)}
          {...ANNOTATION_LIMITS.size}
          onInput={(size) => onPatch({ size })}
        />
      </Section>

      <Section
        title="Background"
        aside={<Toggle checked={plate.on} label="Background" onChange={(on) => patchPlate({ on })} />}
      >
        {plate.on && (
          <>
            <ColorPicker
              colors={[...PLATE_COLORS, ...accents]}
              value={plate.color}
              label="Background color"
              onPick={(color) => patchPlate({ color })}
            />
            <Slider
              label="Opacity"
              value={plate.opacity}
              display={`${Math.round(plate.opacity * 100)} %`}
              min={0.1}
              max={1}
              step={0.05}
              onInput={(opacity) => patchPlate({ opacity })}
            />
            <Slider
              label="Padding"
              value={plate.padding}
              display={`${plate.padding.toFixed(2)} em`}
              {...ANNOTATION_LIMITS.padding}
              onInput={(padding) => patchPlate({ padding })}
            />
            <Slider
              label="Corners"
              value={plate.radius}
              display={`${plate.radius.toFixed(2)} em`}
              {...ANNOTATION_LIMITS.plateRadius}
              onInput={(radius) => patchPlate({ radius })}
            />
          </>
        )}
      </Section>
    </>
  )
}
