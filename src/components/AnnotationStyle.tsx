import ColorPicker from './ColorPicker.tsx'
import { REDACTION_ICON } from './icons.tsx'
import TextStyle from './TextStyle.tsx'
import { Section, Slider, Tile, Toggle } from './ui.tsx'
import { ANNOTATION_LIMITS, isSegment } from '../lib/annotate.ts'
import type { Annotation, Palette, RedactionMode } from '../types.ts'

/* Éditeurs de propriétés d'un calque. Séparés de la liste des calques pour
   qu'aucun des deux fichiers ne devienne un fourre-tout. */

const REDACTIONS: Array<{ value: RedactionMode; label: string }> = [
  { value: 'blur', label: 'blur' },
  { value: 'pixel', label: 'pixel' },
  { value: 'solid', label: 'solid' },
]

/** Couleurs de la DA, toujours proposées. Les accents du screenshot viennent
 *  ensuite : une annotation assortie à l'image tient mieux dans le visuel. */
const BASE_COLORS = ['#FFD479', '#FFFFFF', '#111111', '#FF5A4F', '#8CE99A', '#4D8BFF']

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
      {kind === 'text' && (
        <TextStyle annotation={annotation} accents={palette.accents.slice(0, 4)} onPatch={onPatch} />
      )}

      <Section title={kind === 'text' ? 'Text color' : 'Color'}>
        <ColorPicker
          colors={colors}
          value={annotation.color}
          label={kind === 'text' ? 'Text color' : 'Custom color'}
          onPick={(color) => onPatch({ color })}
        />
        <Slider
          label="Opacity"
          value={annotation.opacity}
          display={`${Math.round(annotation.opacity * 100)} %`}
          {...ANNOTATION_LIMITS.opacity}
          onInput={(opacity) => onPatch({ opacity })}
        />
        <Slider
          label="Shadow"
          value={annotation.shadow}
          display={annotation.shadow === 0 ? 'none' : `${Math.round(annotation.shadow * 100)} %`}
          {...ANNOTATION_LIMITS.shadow}
          onInput={(shadow) => onPatch({ shadow })}
        />
      </Section>

      {kind === 'badge' && (
        <Section title="Badge">
          {/* Le contraste du numéro se déduit du disque : pas de réglage à
              rater côté accessibilité. */}
          <div className="flex items-center justify-between">
            <span className="t-ui text-ink-soft">Invert</span>
            <Toggle checked={annotation.invert} label="Invert" onChange={(invert) => onPatch({ invert })} />
          </div>
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
