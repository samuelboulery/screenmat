import ColorPicker from './ColorPicker.tsx'
import { Section, Slider, Toggle } from './ui.tsx'
import { ANNOTATION_LIMITS, percent } from '../lib/annotate.ts'
import { m } from '../lib/i18n/index.ts'
import type { Annotation } from '../types.ts'

type ShapeStyleProps = {
  annotation: Annotation
  colors: readonly string[]
  onPatch: (patch: Partial<Annotation>) => void
}

/**
 * Fond et contour d'un `box` ou d'une `ellipse` : deux couleurs, chacune sa
 * bascule et sa transparence. Pas d'opacité de calque ici — elle ferait un
 * troisième réglage pour la même chose. Une forme sans fond garde son contour,
 * sinon elle disparaîtrait : la bascule du contour se grise tant que le fond
 * est coupé.
 */
export default function ShapeStyle(props: ShapeStyleProps) {
  const { annotation, onPatch } = props

  return (
    <>
      <FillSection {...props} />
      <StrokeSection {...props} />
      <Section title={m.inspector.shape.appearance}>
        {annotation.kind === 'box' && (
          <Slider
            label={m.inspector.common.corners}
            value={annotation.radius}
            display={percent(annotation.radius)}
            {...ANNOTATION_LIMITS.radius}
            onInput={(radius) => onPatch({ radius })}
          />
        )}
        <Slider
          label={m.inspector.common.shadow}
          value={annotation.shadow}
          display={annotation.shadow === 0 ? m.inspector.common.noShadow : `${Math.round(annotation.shadow * 100)} %`}
          {...ANNOTATION_LIMITS.shadow}
          onInput={(shadow) => onPatch({ shadow })}
        />
      </Section>
    </>
  )
}

function FillSection({ annotation, colors, onPatch }: ShapeStyleProps) {
  const filled = annotation.fill > 0

  return (
    <Section
      title={m.inspector.shape.fill}
      aside={
        <Toggle
          checked={filled}
          label={m.inspector.shape.fill}
          // Couper le fond d'une forme sans contour le lui rend.
          onChange={(on) => onPatch(on ? { fill: 1 } : { fill: 0, stroke: true })}
        />
      }
    >
      {filled && (
        <ColorPicker
          colors={colors}
          value={annotation.fillColor}
          label={m.inspector.shape.fillColor}
          onPick={(fillColor) => onPatch({ fillColor })}
          alpha={annotation.fill}
          onAlpha={(fill) => onPatch({ fill })}
        />
      )}
    </Section>
  )
}

function StrokeSection({ annotation, colors, onPatch }: ShapeStyleProps) {
  const filled = annotation.fill > 0
  const stroked = annotation.stroke || !filled

  return (
    <Section
      title={m.inspector.common.stroke}
      aside={
        <Toggle
          checked={stroked}
          label={m.inspector.common.stroke}
          disabled={!filled}
          title={filled ? undefined : m.inspector.shape.needsInk}
          onChange={(stroke) => onPatch({ stroke })}
        />
      }
    >
      {stroked && (
        <>
          <ColorPicker
            colors={colors}
            value={annotation.color}
            label={m.inspector.shape.strokeColor}
            onPick={(color) => onPatch({ color })}
            alpha={annotation.strokeOpacity}
            onAlpha={(strokeOpacity) => onPatch({ strokeOpacity })}
          />
          <Slider
            label={m.inspector.common.width}
            value={annotation.strokeWidth}
            display={percent(annotation.strokeWidth)}
            {...ANNOTATION_LIMITS.strokeWidth}
            onInput={(strokeWidth) => onPatch({ strokeWidth })}
          />
        </>
      )}
    </Section>
  )
}
