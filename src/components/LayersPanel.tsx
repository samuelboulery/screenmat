import { useRef, useState } from 'react'
import {
  CollapsedIcon,
  ExpandedIcon,
  HiddenIcon,
  KIND_ICON,
  LockedIcon,
  UnlockedIcon,
  VisibleIcon,
} from './icons.tsx'
import { IconButton, Section } from './ui.tsx'
import { badgeNumbers } from '../lib/annotate.ts'
import { flatten, isGroup } from '../lib/tree.ts'
import type { NodePatch } from '../hooks/useShots.ts'
import type { Annotation, AnnotationKind, LayerNode, Shot } from '../types.ts'

/* La pile de calques : arbre, glisser-déposer, œil et cadenas. Aucune
   dépendance — le glisser-déposer est celui du navigateur, comme dans
   `Filmstrip`. */

const KIND_NAME: Record<AnnotationKind, string> = {
  text: 'Label',
  badge: 'Badge',
  arrow: 'Arrow',
  line: 'Line',
  box: 'Box',
  ellipse: 'Ellipse',
  redaction: 'Redacted area',
}

/** Où un nœud déposé doit atterrir. `inside` n'existe que sur un groupe. */
type Drop = { id: string; where: 'before' | 'after' | 'inside' }

export type LayersPanelProps = {
  shot: Shot | null
  selectedIds: readonly string[]
  onSelect: (ids: string[], additive: boolean, range: boolean) => void
  onPatch: (id: string, patch: NodePatch) => void
  onMove: (ids: readonly string[], parentId: string | null, index: number) => void
}

export default function LayersPanel({
  shot,
  selectedIds,
  onSelect,
  onPatch,
  onMove,
}: LayersPanelProps) {
  const layers = shot?.layers ?? []
  const numbers = badgeNumbers(flatten(layers))
  const dragged = useRef<string[]>([])
  const [drop, setDrop] = useState<Drop | null>(null)

  const onDrop = (target: Drop) => {
    const ids = dragged.current
    dragged.current = []
    setDrop(null)
    if (ids.length === 0) return

    const placed = locate(layers, target)
    if (placed) onMove(ids, placed.parentId, placed.index)
  }

  return (
    <Section title={shot ? `Layers — ${shot.name}` : 'Layers'}>
      <div className="space-y-[3px]" onDragLeave={() => setDrop(null)}>
        {layers.length === 0 && (
          <p className="t-ui-small text-dim">No layer yet — pick a tool and drag on the shot.</p>
        )}
        <Rows
          nodes={layers}
          depth={0}
          numbers={numbers}
          selectedIds={selectedIds}
          drop={drop}
          onSelect={onSelect}
          onPatch={onPatch}
          onDragStart={(id) => {
            // Glisser un nœud du lot emmène tout le lot ; sinon, lui seul.
            dragged.current = selectedIds.includes(id) ? [...selectedIds] : [id]
          }}
          onHover={setDrop}
          onDrop={onDrop}
        />
      </div>
    </Section>
  )
}

type RowsProps = {
  nodes: readonly LayerNode[]
  depth: number
  numbers: Map<string, number>
  selectedIds: readonly string[]
  drop: Drop | null
  onSelect: (ids: string[], additive: boolean, range: boolean) => void
  onPatch: (id: string, patch: NodePatch) => void
  onDragStart: (id: string) => void
  onHover: (drop: Drop | null) => void
  onDrop: (drop: Drop) => void
}

/** La pile se lit de haut en bas comme elle se dessine : le dernier calque créé
 *  passe au-dessus, il apparaît donc en tête. */
function Rows(props: RowsProps) {
  return (
    <>
      {[...props.nodes].reverse().map((node) => (
        <div key={node.id}>
          <LayerRow {...props} node={node} />
          {isGroup(node) && !node.collapsed && node.children.length > 0 && (
            <Rows {...props} nodes={node.children} depth={props.depth + 1} />
          )}
        </div>
      ))}
    </>
  )
}

function LayerRow({
  node,
  depth,
  numbers,
  selectedIds,
  drop,
  onSelect,
  onPatch,
  onDragStart,
  onHover,
  onDrop,
}: RowsProps & { node: LayerNode }) {
  const [renaming, setRenaming] = useState(false)
  const active = selectedIds.includes(node.id)
  const target = drop?.id === node.id ? drop.where : null

  return (
    <div
      draggable={!renaming}
      onDragStart={() => onDragStart(node.id)}
      onDragOver={(event) => {
        event.preventDefault()
        onHover({ id: node.id, where: dropZone(event, isGroup(node)) })
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDrop({ id: node.id, where: dropZone(event, isGroup(node)) })
      }}
      aria-grabbed={active || undefined}
      className={`flex items-center gap-2 rounded-sm px-2 py-1 ${
        active ? 'bg-raised ring-1 ring-accent/60' : 'hover:bg-raised/60'
      } ${target === 'before' ? 'border-t border-accent' : ''} ${
        target === 'after' ? 'border-b border-accent' : ''
      } ${target === 'inside' ? 'ring-1 ring-accent' : ''}`}
      style={{ marginLeft: depth * 12 }}
    >
      {isGroup(node) ? (
        <IconButton
          icon={node.collapsed ? CollapsedIcon : ExpandedIcon}
          label={node.collapsed ? 'Expand' : 'Collapse'}
          onClick={() => onPatch(node.id, { collapsed: !node.collapsed })}
          className="size-5"
        />
      ) : (
        <KindIcon
          node={node}
          className={
            active ? 'text-accent' : node.kind === 'redaction' ? 'text-danger' : 'text-dim'
          }
        />
      )}

      {renaming ? (
        <input
          autoFocus
          defaultValue={node.name}
          aria-label="Layer name"
          className="t-ui min-w-0 flex-1 bg-transparent outline-none"
          onBlur={(event) => {
            onPatch(node.id, { name: event.target.value.trim() })
            setRenaming(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setRenaming(false)
          }}
        />
      ) : (
        <button
          type="button"
          aria-pressed={active}
          onDoubleClick={() => setRenaming(true)}
          onClick={(event) =>
            onSelect([node.id], event.metaKey || event.ctrlKey, event.shiftKey)
          }
          className="t-ui min-w-0 flex-1 truncate text-left"
        >
          {label(node, numbers)}
        </button>
      )}

      <IconButton
        icon={node.hidden ? HiddenIcon : VisibleIcon}
        label={node.hidden ? 'Show' : 'Hide'}
        active={node.hidden}
        onClick={() => onPatch(node.id, { hidden: !node.hidden })}
        className="size-6"
      />
      <IconButton
        icon={node.locked ? LockedIcon : UnlockedIcon}
        label={node.locked ? 'Unlock' : 'Lock'}
        active={node.locked}
        onClick={() => onPatch(node.id, { locked: !node.locked })}
        className="size-6"
      />
    </div>
  )
}

/** Un calque porte l'icône de l'outil qui l'a créé. Décorative : la ligne dit
 *  déjà son nom, et le type se relit dans l'inspecteur. */
function KindIcon({ node, className }: { node: Annotation; className: string }) {
  const Icon = KIND_ICON[node.kind]
  return (
    <span className={`flex w-5 justify-center ${className}`}>
      <Icon aria-hidden />
    </span>
  )
}

function label(node: LayerNode, numbers: Map<string, number>): string {
  if (node.name.trim()) return node.name
  if (isGroup(node)) return 'Group'
  const annotation = node as Annotation
  if (annotation.kind === 'badge') return `Badge ${numbers.get(annotation.id) ?? 1}`
  return annotation.text.trim() || KIND_NAME[annotation.kind]
}

/** Quart haut = avant, quart bas = après, milieu d'un groupe = dedans. */
function dropZone(event: React.DragEvent, group: boolean): Drop['where'] {
  const rect = event.currentTarget.getBoundingClientRect()
  const position = (event.clientY - rect.top) / Math.max(1, rect.height)
  if (group && position > 0.25 && position < 0.75) return 'inside'
  return position < 0.5 ? 'before' : 'after'
}

/**
 * Traduit un dépôt en parent + index dans l'arbre. La liste est affichée à
 * l'envers de la pile : déposer « avant » une ligne, c'est se poser *après* elle
 * dans le tableau.
 */
function locate(
  nodes: readonly LayerNode[],
  drop: Drop,
): { parentId: string | null; index: number } | null {
  const walk = (
    list: readonly LayerNode[],
    parentId: string | null,
  ): { parentId: string | null; index: number } | null => {
    for (let index = 0; index < list.length; index += 1) {
      const node = list[index]
      if (node.id === drop.id) {
        if (drop.where === 'inside') return { parentId: node.id, index: 0 }
        return { parentId, index: drop.where === 'before' ? index + 1 : index }
      }
      if (isGroup(node)) {
        const found = walk(node.children, node.id)
        if (found) return found
      }
    }
    return null
  }
  return walk(nodes, null)
}
