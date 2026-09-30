import AnnotationStyle from './AnnotationStyle.tsx'
import {
  BackwardIcon,
  DeleteIcon,
  ForwardIcon,
  GroupIcon,
  KIND_ICON,
  MultipleIcon,
  UngroupIcon,
} from './icons.tsx'
import { Badge, IconButton, Section } from './ui.tsx'
import { findNode, isGroup } from '../lib/tree.ts'
import { m } from '../lib/i18n/index.ts'
import type { Annotation, Shot } from '../types.ts'
import { MAC, keyLabel } from '../lib/keys.ts'

/* L'inspecteur d'un calque sélectionné : ses réglages, puis ses actions. La
   pile elle-même vit dans le panneau gauche, sous les images. */

export type LayerInspectorProps = {
  shot: Shot | null
  selectedIds: readonly string[]
  onPatch: (shotId: string, id: string, patch: Partial<Annotation>) => void
  onDelete: (shotId: string, ids: readonly string[]) => void
  onMove: (shotId: string, id: string, direction: 'up' | 'down') => void
  onGroup: (shotId: string, ids: readonly string[]) => void
  onUngroup: (shotId: string, groupId: string) => void
}

export default function LayerInspector({
  shot,
  selectedIds,
  onPatch,
  onDelete,
  onMove,
  onGroup,
  onUngroup,
}: LayerInspectorProps) {
  const found = shot && selectedIds.length === 1 ? findNode(shot.layers, selectedIds[0]) : null
  const node = found?.node ?? null
  const annotation = node && !isGroup(node) ? node : null
  const siblings = found ? (found.parent?.children ?? shot?.layers ?? []) : []
  const KindMark = annotation ? KIND_ICON[annotation.kind] : node ? GroupIcon : MultipleIcon

  return (
    <>
      {annotation && shot && (
        <AnnotationStyle
          annotation={annotation}
          palette={shot.palette}
          onPatch={(patch) => onPatch(shot.id, annotation.id, patch)}
        />
      )}

      {shot && selectedIds.length > 0 && (
        <Section title={m.inspector.layer.title(selectedIds.length)}>
          <div className="flex items-center justify-between">
            {/* Le badge nomme le type du calque sélectionné. Il porte l'icône de
                l'outil qui l'a créé et le mot en entier : l'abréviation mono
                n'avait de sens que tant que le rail parlait le même dialecte. */}
            <Badge tone={annotation?.kind === 'redaction' ? 'danger' : undefined}>
              <span className="flex items-center gap-1.5">
                <KindMark className="size-3" />
                {node && isGroup(node)
                  ? m.inspector.layer.group
                  : annotation
                    ? m.inspector.layer.kinds[annotation.kind]
                    : m.inspector.layer.count(selectedIds.length)}
              </span>
            </Badge>
            <div className="flex items-center gap-0.5">
              {node && (
                <>
                  <IconButton
                    icon={BackwardIcon}
                    label={keyLabel(m.inspector.layer.backward, MAC)}
                    disabled={!found || found.index <= 0}
                    onClick={() => onMove(shot.id, node.id, 'down')}
                  />
                  <IconButton
                    icon={ForwardIcon}
                    label={keyLabel(m.inspector.layer.forward, MAC)}
                    disabled={!found || found.index >= siblings.length - 1}
                    onClick={() => onMove(shot.id, node.id, 'up')}
                  />
                </>
              )}
              {node && isGroup(node) ? (
                <IconButton
                  icon={UngroupIcon}
                  label={keyLabel(m.inspector.layer.ungroup, MAC)}
                  onClick={() => onUngroup(shot.id, node.id)}
                />
              ) : (
                selectedIds.length > 1 && (
                  <IconButton
                    icon={GroupIcon}
                    label={keyLabel(m.inspector.layer.groupAction, MAC)}
                    onClick={() => onGroup(shot.id, selectedIds)}
                  />
                )
              )}
              <IconButton
                icon={DeleteIcon}
                label={keyLabel(m.inspector.layer.remove, MAC)}
                tone="danger"
                onClick={() => onDelete(shot.id, selectedIds)}
              />
            </div>
          </div>
        </Section>
      )}
    </>
  )
}
