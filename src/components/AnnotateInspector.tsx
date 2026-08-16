import { Badge, Panel, Row, Section, Slider, Tile } from './ui.tsx'
import type { Annotation, LabelStyle, RedactionMode } from '../types.ts'

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

const KIND_LABEL: Record<Annotation['kind'], string> = {
  text: 'TXT',
  arrow: 'ARR',
  box: 'BOX',
  redaction: 'RDC',
}

type AnnotateInspectorProps = {
  annotations: readonly Annotation[]
  selectedId: string | null
  onSelect: (id: string) => void
  onPatch: (id: string, patch: Partial<Annotation>) => void
  onDelete: (id: string) => void
  /** Descendu sous le bouton de la feuille rétractable, en mode étroit. */
  offset?: boolean
}

export default function AnnotateInspector({
  annotations,
  selectedId,
  onSelect,
  onPatch,
  onDelete,
  offset = false,
}: AnnotateInspectorProps) {
  const selected = annotations.find((annotation) => annotation.id === selectedId) ?? null

  return (
    <Panel
      className={`absolute right-5 z-10 max-h-[calc(100%-190px)] w-72 space-y-4 overflow-y-auto p-[18px] ${offset ? 'top-[124px]' : 'top-[88px]'}`}
    >
      <Section title="Layers">
        <div className="space-y-[3px]">
          {annotations.length === 0 && (
            <p className="t-ui-small text-dim">No layer yet — pick a tool and drag on the shot.</p>
          )}
          {annotations.map((annotation) => (
            <Row
              key={annotation.id}
              active={annotation.id === selectedId}
              onClick={() => onSelect(annotation.id)}
            >
              <span
                className={`font-mono text-[9px] ${
                  annotation.id === selectedId
                    ? 'text-accent-ink'
                    : annotation.kind === 'redaction'
                      ? 'text-danger'
                      : 'text-dim'
                }`}
              >
                {KIND_LABEL[annotation.kind]}
              </span>
              <span className="t-ui truncate">
                {annotation.text.trim() || labelFor(annotation.kind)}
              </span>
            </Row>
          ))}
        </div>
      </Section>

      {selected && selected.kind === 'text' && (
        <Section title="Selected label">
          <input
            type="text"
            value={selected.text}
            onChange={(event) => onPatch(selected.id, { text: event.target.value })}
            aria-label="Label text"
            className="w-full rounded-[9px] border border-hairline bg-sunken px-3 py-2 text-[12px] text-ink placeholder:text-dim"
          />
          <div className="grid grid-cols-3 gap-1">
            {LABEL_STYLES.map((style) => (
              <Tile
                key={style.value}
                active={selected.labelStyle === style.value}
                onClick={() => onPatch(selected.id, { labelStyle: style.value })}
                className="h-[34px] rounded-lg font-mono text-[9px]"
              >
                {style.label}
              </Tile>
            ))}
          </div>
          <Slider
            label="Size"
            value={selected.size}
            display={`${(selected.size * 100).toFixed(1)} %`}
            min={0.005}
            max={0.04}
            step={0.001}
            onInput={(size) => onPatch(selected.id, { size })}
          />
        </Section>
      )}

      {selected && selected.kind === 'redaction' && (
        <Section title="Redaction">
          <div className="grid grid-cols-3 gap-1">
            {REDACTIONS.map((mode) => (
              <Tile
                key={mode.value}
                tone="danger"
                active={selected.redaction === mode.value}
                onClick={() => onPatch(selected.id, { redaction: mode.value })}
                className="h-[34px] rounded-lg font-mono text-[9px]"
              >
                {mode.label}
              </Tile>
            ))}
          </div>
          <p className="t-ui-small text-dim">
            Baked into the pixels at export — the original is never recoverable from the file.
          </p>
        </Section>
      )}

      {selected && (
        <Section title="Layer">
          <div className="flex items-center justify-between">
            <Badge tone={selected.kind === 'redaction' ? 'danger' : undefined}>
              {KIND_LABEL[selected.kind]}
            </Badge>
            <button
              type="button"
              onClick={() => onDelete(selected.id)}
              className="t-ui-small text-danger hover:underline"
            >
              Delete ⌫
            </button>
          </div>
        </Section>
      )}
    </Panel>
  )
}

function labelFor(kind: Annotation['kind']): string {
  return { text: 'Label', arrow: 'Arrow', box: 'Box', redaction: 'Redacted area' }[kind]
}
