import AnnotationStyle from './AnnotationStyle.tsx'
import LayersPanel from './LayersPanel.tsx'
import {
  BackwardIcon,
  DeleteIcon,
  ForwardIcon,
  GroupIcon,
  KIND_ICON,
  MultipleIcon,
  UngroupIcon,
} from './icons.tsx'
import { Badge, IconButton, Panel, Section } from './ui.tsx'
import { findNode, isGroup } from '../lib/tree.ts'
import type { NodePatch } from '../hooks/useShots.ts'
import type { Annotation, AnnotationKind, Shot } from '../types.ts'

/** Le badge nomme le type du calque sélectionné. Il porte l'icône de l'outil
 *  qui l'a créé et le mot en entier : l'abréviation mono n'avait de sens que
 *  tant que le rail parlait le même dialecte. */
const KIND_LABEL: Record<AnnotationKind, string> = {
  text: 'Label',
  badge: 'Badge',
  arrow: 'Arrow',
  line: 'Line',
  box: 'Box',
  ellipse: 'Ellipse',
  redaction: 'Redact',
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
  const KindMark = annotation ? KIND_ICON[annotation.kind] : node ? GroupIcon : MultipleIcon

  return (
    <Panel
      className={`absolute right-5 z-10 max-h-[calc(100%-190px)] w-72 space-y-4 overflow-y-auto p-4 ${offset ? 'top-[124px]' : 'top-[88px]'}`}
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
              <span className="flex items-center gap-1.5">
                <KindMark className="size-3" />
                {node && isGroup(node)
                  ? 'Group'
                  : annotation
                    ? KIND_LABEL[annotation.kind]
                    : `${selectedIds.length} layers`}
              </span>
            </Badge>
            <div className="flex items-center gap-0.5">
              {node && (
                <>
                  <IconButton
                    icon={BackwardIcon}
                    label="Send backward (⌘↓)"
                    disabled={!found || found.index <= 0}
                    onClick={() => onMove(shot.id, node.id, 'down')}
                  />
                  <IconButton
                    icon={ForwardIcon}
                    label="Bring forward (⌘↑)"
                    disabled={!found || found.index >= siblings.length - 1}
                    onClick={() => onMove(shot.id, node.id, 'up')}
                  />
                </>
              )}
              {node && isGroup(node) ? (
                <IconButton
                  icon={UngroupIcon}
                  label="Ungroup (⇧⌘G)"
                  onClick={() => onUngroup(shot.id, node.id)}
                />
              ) : (
                selectedIds.length > 1 && (
                  <IconButton
                    icon={GroupIcon}
                    label="Group (⌘G)"
                    onClick={() => onGroup(shot.id, selectedIds)}
                  />
                )
              )}
              <IconButton
                icon={DeleteIcon}
                label="Delete (⌫)"
                tone="danger"
                onClick={() => onDelete(shot.id, selectedIds)}
              />
            </div>
          </div>
        </Section>
      )}
    </Panel>
  )
}
