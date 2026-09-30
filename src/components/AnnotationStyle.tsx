import ColorPicker from './ColorPicker.tsx'
import { KIND_ICON, REDACTION_ICON } from './icons.tsx'
import ShapeStyle from './ShapeStyle.tsx'
import TextStyle from './TextStyle.tsx'
import { Section, Slider, Tile, Toggle } from './ui.tsx'
import { ANNOTATION_LIMITS, isSegment, percent } from '../lib/annotate.ts'
import type { Annotation, Palette, RedactionMode, RedactionShape } from '../types.ts'

/* Éditeurs de propriétés d'un calque. Séparés de la liste des calques pour
   qu'aucun des deux fichiers ne devienne un fourre-tout. */

const REDACTIONS: Array<{ value: RedactionMode; label: string }> = [
  { value: 'blur', label: 'blur' },
  { value: 'pixel', label: 'pixel' },
  { value: 'solid', label: 'solid' },
]

/** La forme d'une zone floutée porte l'icône de l'outil qui trace la même. */
const SHAPES: Array<{ value: RedactionShape; label: string; icon: 'box' | 'ellipse' }> = [
  { value: 'rect', label: 'rectangle', icon: 'box' },
  { value: 'ellipse', label: 'ellipse', icon: 'ellipse' },
]

/** Couleurs de la DA, toujours proposées. Les accents du screenshot viennent
 *  ensuite : une annotation assortie à l'image tient mieux dans le visuel. */
const BASE_COLORS = ['#FFD479', '#FFFFFF', '#111111', '#FF5A4F', '#8CE99A', '#4D8BFF']

type AnnotationStyleProps = {
  annotation: Annotation
  palette: Palette
  onPatch: (patch: Partial<Annotation>) => void
}

export default function AnnotationStyle({
  annotation,
  palette,
  onPatch,
}: AnnotationStyleProps) {
  const { kind } = annotation
  const stroked = isSegment(kind)

  if (kind === 'redaction') {
    return (
      <Section title="Redaction">
        <div className="grid grid-cols-2 gap-1">
          {SHAPES.map((shape) => {
            const Icon = KIND_ICON[shape.icon]
            return (
              <Tile
                key={shape.value}
                tone="danger"
                active={annotation.redactionShape === shape.value}
                onClick={() => onPatch({ redactionShape: shape.value })}
                className="h-11 font-mono text-[10px]"
              >
                <Icon />
                {shape.label}
              </Tile>
            )
          })}
        </div>
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

  if (kind === 'box' || kind === 'ellipse') {
    return <ShapeStyle annotation={annotation} colors={colors} onPatch={onPatch} />
  }

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
          {kind === 'arrow' && (
            <Slider
              label="Head"
              value={annotation.arrowHead}
              display={percent(annotation.arrowHead)}
              {...ANNOTATION_LIMITS.arrowHead}
              onInput={(arrowHead) => onPatch({ arrowHead })}
            />
          )}
        </Section>
      )}
    </>
  )
}
