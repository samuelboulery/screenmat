import AnnotationStyle from './AnnotationStyle.tsx'
import { Badge, Panel, Row, Section } from './ui.tsx'
import { badgeNumbers } from '../lib/annotate.ts'
import type { Annotation, AnnotationKind, Shot } from '../types.ts'

const KIND_LABEL: Record<AnnotationKind, string> = {
  text: 'TXT',
  badge: 'NUM',
  arrow: 'ARR',
  line: 'LIN',
  box: 'BOX',
  ellipse: 'ELL',
  redaction: 'RDC',
}

const KIND_NAME: Record<AnnotationKind, string> = {
  text: 'Label',
  badge: 'Badge',
  arrow: 'Arrow',
  line: 'Line',
  box: 'Box',
  ellipse: 'Ellipse',
  redaction: 'Redacted area',
}

type AnnotateInspectorProps = {
  shot: Shot | null
  selectedId: string | null
  onSelect: (id: string) => void
  onPatch: (shotId: string, id: string, patch: Partial<Annotation>) => void
  onDelete: (shotId: string, id: string) => void
  onMove: (shotId: string, id: string, direction: 'up' | 'down') => void
  /** Descendu sous le bouton de la feuille rétractable, en mode étroit. */
  offset?: boolean
}

export default function AnnotateInspector({
  shot,
  selectedId,
  onSelect,
  onPatch,
  onDelete,
  onMove,
  offset = false,
}: AnnotateInspectorProps) {
  const annotations = shot?.annotations ?? []
  const selected = annotations.find((annotation) => annotation.id === selectedId) ?? null
  const numbers = badgeNumbers(annotations)
  const index = selected ? annotations.indexOf(selected) : -1

  return (
    <Panel
      className={`absolute right-5 z-10 max-h-[calc(100%-190px)] w-72 space-y-4 overflow-y-auto p-[18px] ${offset ? 'top-[124px]' : 'top-[88px]'}`}
    >
      <Section title={shot ? `Layers — ${shot.name}` : 'Layers'}>
        <div className="space-y-[3px]">
          {annotations.length === 0 && (
            <p className="t-ui-small text-dim">No layer yet — pick a tool and drag on the shot.</p>
          )}
          {/* La pile se lit de haut en bas comme elle se dessine : le dernier
              calque créé passe au-dessus, il apparaît donc en tête. */}
          {[...annotations].reverse().map((annotation) => (
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
                {annotation.kind === 'badge'
                  ? `Badge ${numbers.get(annotation.id) ?? 1}`
                  : annotation.text.trim() || KIND_NAME[annotation.kind]}
              </span>
            </Row>
          ))}
        </div>
      </Section>

      {selected && shot && (
        <AnnotationStyle
          annotation={selected}
          palette={shot.palette}
          onPatch={(patch) => onPatch(shot.id, selected.id, patch)}
        />
      )}

      {selected && shot && (
        <Section title="Layer">
          <div className="flex items-center justify-between">
            <Badge tone={selected.kind === 'redaction' ? 'danger' : undefined}>
              {KIND_LABEL[selected.kind]}
            </Badge>
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Send backward (⌘↓)"
                disabled={index <= 0}
                onClick={() => onMove(shot.id, selected.id, 'down')}
                className="t-ui-small text-ink-soft hover:text-ink disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                title="Bring forward (⌘↑)"
                disabled={index < 0 || index >= annotations.length - 1}
                onClick={() => onMove(shot.id, selected.id, 'up')}
                className="t-ui-small text-ink-soft hover:text-ink disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onDelete(shot.id, selected.id)}
                className="t-ui-small text-danger hover:underline"
              >
                Delete ⌫
              </button>
            </div>
          </div>
        </Section>
      )}
    </Panel>
  )
}
