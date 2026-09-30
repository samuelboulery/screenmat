import ColorPicker from './ColorPicker.tsx'
import { KIND_ICON, REDACTION_ICON } from './icons.tsx'
import ShapeStyle from './ShapeStyle.tsx'
import TextStyle from './TextStyle.tsx'
import { Section, Slider, Tile, Toggle } from './ui.tsx'
import { ANNOTATION_LIMITS, isSegment, percent } from '../lib/annotate.ts'
import { m } from '../lib/i18n/index.ts'
import type { Annotation, Palette, RedactionMode, RedactionShape } from '../types.ts'

/* Éditeurs de propriétés d'un calque. Séparés de la liste des calques pour
   qu'aucun des deux fichiers ne devienne un fourre-tout. */

const REDACTIONS: readonly RedactionMode[] = ['blur', 'pixel', 'solid']

/** La forme d'une zone floutée porte l'icône de l'outil qui trace la même. */
const SHAPES: Array<{ value: RedactionShape; icon: 'box' | 'ellipse' }> = [
  { value: 'rect', icon: 'box' },
  { value: 'ellipse', icon: 'ellipse' },
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
      <Section title={m.inspector.redaction.title}>
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
                {m.inspector.redaction.shapes[shape.value]}
              </Tile>
            )
          })}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {REDACTIONS.map((mode) => {
            const Icon = REDACTION_ICON[mode]
            return (
              <Tile
                key={mode}
                tone="danger"
                active={annotation.redaction === mode}
                onClick={() => onPatch({ redaction: mode })}
                className="h-11 font-mono text-[10px]"
              >
                <Icon />
                {m.inspector.redaction.modes[mode]}
              </Tile>
            )
          })}
        </div>
        <p className="t-ui-small text-dim">
          {m.inspector.redaction.note}
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

      <Section title={kind === 'text' ? m.inspector.color.text : m.inspector.color.title}>
        <ColorPicker
          colors={colors}
          value={annotation.color}
          label={kind === 'text' ? m.inspector.color.text : m.inspector.color.custom}
          onPick={(color) => onPatch({ color })}
        />
        <Slider
          label={m.inspector.common.opacity}
          value={annotation.opacity}
          display={`${Math.round(annotation.opacity * 100)} %`}
          {...ANNOTATION_LIMITS.opacity}
          onInput={(opacity) => onPatch({ opacity })}
        />
        <Slider
          label={m.inspector.common.shadow}
          value={annotation.shadow}
          display={annotation.shadow === 0 ? m.inspector.common.noShadow : `${Math.round(annotation.shadow * 100)} %`}
          {...ANNOTATION_LIMITS.shadow}
          onInput={(shadow) => onPatch({ shadow })}
        />
      </Section>

      {kind === 'badge' && (
        <Section title={m.inspector.badge.title}>
          {/* Le contraste du numéro se déduit du disque : pas de réglage à
              rater côté accessibilité. */}
          <div className="flex items-center justify-between">
            <span className="t-ui text-ink-soft">{m.inspector.badge.invert}</span>
            <Toggle checked={annotation.invert} label={m.inspector.badge.invert} onChange={(invert) => onPatch({ invert })} />
          </div>
          <Slider
            label={m.inspector.common.size}
            value={annotation.size}
            display={percent(annotation.size)}
            {...ANNOTATION_LIMITS.size}
            onInput={(size) => onPatch({ size })}
          />
        </Section>
      )}

      {stroked && (
        <Section title={m.inspector.common.stroke}>
          <Slider
            label={m.inspector.common.width}
            value={annotation.strokeWidth}
            display={percent(annotation.strokeWidth)}
            {...ANNOTATION_LIMITS.strokeWidth}
            onInput={(strokeWidth) => onPatch({ strokeWidth })}
          />
          {kind === 'arrow' && (
            <Slider
              label={m.inspector.segment.head}
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
