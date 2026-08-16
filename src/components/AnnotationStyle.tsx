import { REDACTION_ICON } from './icons.tsx'
import { Section, Slider, Swatch, Tile, Toggle } from './ui.tsx'
import { ANNOTATION_LIMITS, isPoint, isSegment } from '../lib/annotate.ts'
import type { Annotation, LabelStyle, Palette, RedactionMode } from '../types.ts'

/* Éditeurs de propriétés d'un calque. Séparés de la liste des calques pour
   qu'aucun des deux fichiers ne devienne un fourre-tout. */

const LABEL_STYLES: Array<{ value: LabelStyle; label: string }> = [
  { value: 'pill', label: 'pill' },
  { value: 'plain', label: 'plain' },
  { value: 'badge', label: 'badge' },
]

const REDACTIONS: Array<{ value: RedactionMode; label: string }> = [
  { value: 'blur', label: 'blur' },
  { value: 'pixel', label: 'pixel' },
  { value: 'solid', label: 'solid' },
]

/** Couleurs de la DA, toujours proposées. Les accents du screenshot viennent
 *  ensuite : une annotation assortie à l'image tient mieux dans le visuel. */
const BASE_COLORS = ['#7DE2FF', '#A378FF', '#FF9A9A', '#FFD479', '#8CE99A', '#FFFFFF']

type AnnotationStyleProps = {
  annotation: Annotation
  palette: Palette
  onPatch: (patch: Partial<Annotation>) => void
}

/** Pourcentage lisible pour une fraction de la largeur de la fenêtre. */
function percent(value: number): string {
  return `${(value * 100).toFixed(2)} %`
}

export default function AnnotationStyle({
  annotation,
  palette,
  onPatch,
}: AnnotationStyleProps) {
  const { kind } = annotation
  const closed = kind === 'box' || kind === 'ellipse'
  const stroked = closed || isSegment(kind)

  if (kind === 'redaction') {
    return (
      <Section title="Redaction">
        <div className="grid grid-cols-3 gap-1">
          {REDACTIONS.map((mode) => {
            const Icon = REDACTION_ICON[mode.value]
            return (
              <Tile
                key={mode.value}
                tone="danger"
                active={annotation.redaction === mode.value}
                onClick={() => onPatch({ redaction: mode.value })}
                className="h-11 font-mono text-[10px]"
              >
                <Icon />
                {mode.label}
              </Tile>
            )
          })}
        </div>
        <p className="t-ui-small text-dim">
          Baked into the pixels at export — the original is never recoverable from the file.
        </p>
      </Section>
    )
  }

  const colors = [...BASE_COLORS, ...palette.accents.slice(0, 4)]

  return (
    <>
      <Section title="Color">
        <div className="flex flex-wrap gap-1.5">
          {colors.map((color) => (
            <Swatch
              key={color}
              color={color}
              active={annotation.color.toUpperCase() === color.toUpperCase()}
              onClick={() => onPatch({ color })}
            />
          ))}
          {/* L'input garde sa taille : réduit à 0×0 il restait focalisable, et
              l'anneau de focus n'avait plus rien à entourer. Ici il couvre tout
              le carré, invisible mais focalisable là où on le voit. */}
          <label
            title="Custom color"
            className="relative flex size-10 items-center justify-center rounded-lg border border-dashed border-white/20 text-[10px] text-dim hover:border-white/35"
          >
            <span aria-hidden>···</span>
            <input
              type="color"
              value={annotation.color}
              aria-label="Custom color"
              onChange={(event) => onPatch({ color: event.target.value })}
              className="absolute inset-0 size-full rounded-lg opacity-0"
            />
          </label>
        </div>
        <Slider
          label="Opacity"
          value={annotation.opacity}
          display={`${Math.round(annotation.opacity * 100)} %`}
          {...ANNOTATION_LIMITS.opacity}
          onInput={(opacity) => onPatch({ opacity })}
        />
      </Section>

      {isPoint(kind) && (
        <Section title={kind === 'text' ? 'Label' : 'Badge'}>
          {kind === 'text' && (
            <>
              <input
                type="text"
                value={annotation.text}
                onChange={(event) => onPatch({ text: event.target.value })}
                aria-label="Label text"
                className="w-full rounded-md border border-hairline bg-sunken px-3 py-2 text-[12px] text-ink placeholder:text-dim"
              />
              <div className="grid grid-cols-3 gap-1">
                {LABEL_STYLES.map((style) => (
                  <Tile
                    key={style.value}
                    active={annotation.labelStyle === style.value}
                    onClick={() => onPatch({ labelStyle: style.value })}
                    className="h-[34px] font-mono text-[10px]"
                  >
                    {style.label}
                  </Tile>
                ))}
              </div>
            </>
          )}
          {/* Le contraste du texte se déduit du fond : pas de réglage à
              rater côté accessibilité. Sans effet sur un label `plain`. */}
          {(kind === 'badge' || annotation.labelStyle !== 'plain') && (
            <div className="flex items-center justify-between">
              <span className="t-ui text-ink-soft">Invert</span>
              <Toggle
                checked={annotation.invert}
                label="Invert"
                onChange={(invert) => onPatch({ invert })}
              />
            </div>
          )}
          <Slider
            label="Size"
            value={annotation.size}
            display={percent(annotation.size)}
            {...ANNOTATION_LIMITS.size}
            onInput={(size) => onPatch({ size })}
          />
        </Section>
      )}

      {stroked && (
        <Section title="Stroke">
          <Slider
            label="Width"
            value={annotation.strokeWidth}
            display={percent(annotation.strokeWidth)}
            {...ANNOTATION_LIMITS.strokeWidth}
            onInput={(strokeWidth) => onPatch({ strokeWidth })}
          />
          {kind === 'box' && (
            <Slider
              label="Corners"
              value={annotation.radius}
              display={percent(annotation.radius)}
              {...ANNOTATION_LIMITS.radius}
              onInput={(radius) => onPatch({ radius })}
            />
          )}
          {kind === 'arrow' && (
            <Slider
              label="Head"
              value={annotation.arrowHead}
              display={percent(annotation.arrowHead)}
              {...ANNOTATION_LIMITS.arrowHead}
              onInput={(arrowHead) => onPatch({ arrowHead })}
            />
          )}
          {closed && (
            <Slider
              label="Fill"
              value={annotation.fill}
              display={annotation.fill === 0 ? 'none' : `${Math.round(annotation.fill * 100)} %`}
              {...ANNOTATION_LIMITS.fill}
              onInput={(fill) => onPatch({ fill })}
            />
          )}
        </Section>
      )}
    </>
  )
}
