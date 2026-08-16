import AnnotationStyle from './AnnotationStyle.tsx'
import LayersPanel from './LayersPanel.tsx'
import { Badge, Panel, Section } from './ui.tsx'
import { findNode, isGroup } from '../lib/tree.ts'
import type { NodePatch } from '../hooks/useShots.ts'
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

type AnnotateInspectorProps = {
  shot: Shot | null
  selectedIds: readonly string[]
  onSelect: (ids: string[], additive: boolean, range: boolean) => void
  onPatch: (shotId: string, id: string, patch: Partial<Annotation>) => void
  onPatchNode: (shotId: string, id: string, patch: NodePatch) => void
  onDelete: (shotId: string, ids: readonly string[]) => void
  onMove: (shotId: string, id: string, direction: 'up' | 'down') => void
  onMoveTo: (shotId: string, ids: readonly string[], parentId: string | null, index: number) => void
  onGroup: (shotId: string, ids: readonly string[]) => void
  onUngroup: (shotId: string, groupId: string) => void
  /** Descendu sous le bouton de la feuille rétractable, en mode étroit. */
  offset?: boolean
}

export default function AnnotateInspector({
  shot,
  selectedIds,
  onSelect,
  onPatch,
  onPatchNode,
  onDelete,
  onMove,
  onMoveTo,
  onGroup,
  onUngroup,
  offset = false,
}: AnnotateInspectorProps) {
  const found = shot && selectedIds.length === 1 ? findNode(shot.layers, selectedIds[0]) : null
  const node = found?.node ?? null
  const annotation = node && !isGroup(node) ? node : null
  const siblings = found ? (found.parent?.children ?? shot?.layers ?? []) : []

  return (
    <Panel
      className={`absolute right-5 z-10 max-h-[calc(100%-190px)] w-72 space-y-4 overflow-y-auto p-[18px] ${offset ? 'top-[124px]' : 'top-[88px]'}`}
    >
      <LayersPanel
        shot={shot}
        selectedIds={selectedIds}
        onSelect={onSelect}
        onPatch={(id, patch) => shot && onPatchNode(shot.id, id, patch)}
        onMove={(ids, parentId, index) => shot && onMoveTo(shot.id, ids, parentId, index)}
      />

      {annotation && shot && (
        <AnnotationStyle
          annotation={annotation}
          palette={shot.palette}
          onPatch={(patch) => onPatch(shot.id, annotation.id, patch)}
        />
      )}

      {shot && selectedIds.length > 0 && (
        <Section title={selectedIds.length > 1 ? `Layers — ${selectedIds.length}` : 'Layer'}>
          <div className="flex items-center justify-between">
            <Badge tone={annotation?.kind === 'redaction' ? 'danger' : undefined}>
              {node && isGroup(node) ? 'GRP' : annotation ? KIND_LABEL[annotation.kind] : 'MUL'}
            </Badge>
            <div className="flex items-center gap-2">
              {node && (
                <>
                  <button
                    type="button"
                    title="Send backward (⌘↓)"
                    disabled={!found || found.index <= 0}
                    onClick={() => onMove(shot.id, node.id, 'down')}
                    className="t-ui-small text-ink-soft hover:text-ink disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    title="Bring forward (⌘↑)"
                    disabled={!found || found.index >= siblings.length - 1}
                    onClick={() => onMove(shot.id, node.id, 'up')}
                    className="t-ui-small text-ink-soft hover:text-ink disabled:opacity-30"
                  >
                    ↑
                  </button>
                </>
              )}
              {node && isGroup(node) ? (
                <button
                  type="button"
                  title="Ungroup (⇧⌘G)"
                  onClick={() => onUngroup(shot.id, node.id)}
                  className="t-ui-small text-ink-soft hover:text-ink"
                >
                  Ungroup
                </button>
              ) : (
                selectedIds.length > 1 && (
                  <button
                    type="button"
                    title="Group (⌘G)"
                    onClick={() => onGroup(shot.id, selectedIds)}
                    className="t-ui-small text-ink-soft hover:text-ink"
                  >
                    Group
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => onDelete(shot.id, selectedIds)}
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
