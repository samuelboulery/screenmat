import ColorPicker from './ColorPicker.tsx'
import { Section, Slider, Toggle } from './ui.tsx'
import { ANNOTATION_LIMITS, percent } from '../lib/annotate.ts'
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
      <Section title="Appearance">
        {annotation.kind === 'box' && (
          <Slider
            label="Corners"
            value={annotation.radius}
            display={percent(annotation.radius)}
            {...ANNOTATION_LIMITS.radius}
            onInput={(radius) => onPatch({ radius })}
          />
        )}
        <Slider
          label="Shadow"
          value={annotation.shadow}
          display={annotation.shadow === 0 ? 'none' : `${Math.round(annotation.shadow * 100)} %`}
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
      title="Fill"
      aside={
        <Toggle
          checked={filled}
          label="Fill"
          // Couper le fond d'une forme sans contour le lui rend.
          onChange={(on) => onPatch(on ? { fill: 1 } : { fill: 0, stroke: true })}
        />
      }
    >
      {filled && (
        <ColorPicker
          colors={colors}
          value={annotation.fillColor}
          label="Fill color"
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
      title="Stroke"
      aside={
        <Toggle
          checked={stroked}
          label="Stroke"
          disabled={!filled}
          title={filled ? undefined : 'A shape needs a fill or a stroke'}
          onChange={(stroke) => onPatch({ stroke })}
        />
      }
    >
      {stroked && (
        <>
          <ColorPicker
            colors={colors}
            value={annotation.color}
            label="Stroke color"
            onPick={(color) => onPatch({ color })}
            alpha={annotation.strokeOpacity}
            onAlpha={(strokeOpacity) => onPatch({ strokeOpacity })}
          />
          <Slider
            label="Width"
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
