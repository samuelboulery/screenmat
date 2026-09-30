import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import FirstTips from './FirstTips.tsx'
import ImagesPanel from './ImagesPanel.tsx'
import { CloseSheetIcon, OpenSheetIcon, RedoIcon, UndoIcon } from './icons.tsx'
import Inspector from './Inspector.tsx'
import Preview, { type Editing } from './Preview.tsx'
import ToolRail from './ToolRail.tsx'
import type { Point } from '../lib/annotate.ts'
import { rememberToolStyle } from '../lib/tool-style.ts'
import { m } from '../lib/i18n/index.ts'
import { toolForKey, type Tool } from '../lib/tools.ts'
import { IconButton, Panel } from './ui.tsx'
import { displayOrder, findAnnotation } from '../lib/tree.ts'
import type { NodePatch } from '../hooks/useShots.ts'
import type {
  Annotation,
  AnnotationKind,
  Composition,
  FractionRect,
  OutputMode,
  Pan,
  Placement,
  QueueItem,
  Scene,
  Settings,
  Shot,
} from '../types.ts'

/** Les panneaux flottent au-dessus du canvas : la boîte disponible est réduite
 *  d'autant. Images à gauche (240 px), inspecteur à droite (288 px), barre
 *  d'outils en haut et barre du document en bas. */
const INSET = { left: 280, right: 328, top: 80, bottom: 76 }
/** Sous 1100 px : l'inspecteur devient une feuille, le canvas s'élargit. */
const NARROW_INSET = { left: 280, right: 20, top: 80, bottom: 76 }

const ANNOTATION_KIND: Record<Tool, AnnotationKind | 'select'> = {
  SEL: 'select',
  TXT: 'text',
  NUM: 'badge',
  ARR: 'arrow',
  LIN: 'line',
  BOX: 'box',
  ELL: 'ellipse',
  RDC: 'redaction',
}

export type EditorScreenProps = {
  scene: Scene
  shots: readonly Shot[]
  activeShotId: string
  /** Membres de la composition, en mode combiné. */
  members: readonly string[]
  mode: OutputMode
  /** État de chaque image dans le lot en cours d'export. */
  queue: readonly QueueItem[]
  selectedLayerIds: readonly string[]
  /** La section « Style » de l'inspecteur, quand un style est appliqué. */
  style: ReactNode
  /** Vrai sous 1100 px : l'inspecteur se replie en feuille. */
  narrow: boolean
  /** Dimensions de sortie, affichées sous le canvas. */
  output: { width: number; height: number } | null
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onNewSession: () => void
  /** Touches nues de l'édition, à poser sur le canvas — voir `useShortcuts`. */
  onKeys: (event: React.KeyboardEvent) => void
  onChange: (patch: Partial<Settings>) => void
  onCompose: (patch: Partial<Composition>) => void
  onPlace: (shotId: string, patch: Partial<Placement>) => void
  onPan: (shotId: string, pan: Pan, travel: Point) => void
  onMode: (mode: OutputMode) => void
  onActivate: (id: string) => void
  onToggleMember: (id: string) => void
  onReorderShots: (from: number, to: number) => void
  onAddShot: () => void
  onPickBackgroundImage: () => void
  onCreateAnnotation: (shotId: string, kind: AnnotationKind, rect: FractionRect) => string
  onPatchAnnotation: (shotId: string, id: string, patch: Partial<Annotation>) => void
  onPatchNode: (shotId: string, id: string, patch: NodePatch) => void
  onTranslateLayers: (shotId: string, ids: readonly string[], dx: number, dy: number) => void
  onDuplicateLayers: (shotId: string, ids: readonly string[], offset?: number) => string[]
  onDeleteLayers: (shotId: string, ids: readonly string[]) => void
  onMoveLayer: (shotId: string, id: string, direction: 'up' | 'down') => void
  onMoveLayers: (shotId: string, ids: readonly string[], parentId: string | null, index: number) => void
  onGroupLayers: (shotId: string, ids: readonly string[]) => void
  onUngroupLayer: (shotId: string, groupId: string) => void
  onSelectLayers: (shotId: string | null, ids: readonly string[], additive: boolean) => void
}

/**
 * L'espace de travail unique : les images et leurs calques à gauche, le canvas
 * au centre avec ses outils au-dessus, l'inspecteur à droite. Séparé ou
 * combiné, une image ou vingt, c'est le même écran.
 */
export default function EditorScreen(props: EditorScreenProps) {
  const { scene, shots, narrow } = props
  /** L'outil reste en main après un tracé : `Escape` ou `V` le rendent. */
  const [tool, setTool] = useState<Tool>('SEL')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Editing | null>(null)
  /** Point d'ancrage d'une sélection de plage (⇧-clic dans le panneau). */
  const anchor = useRef<string | null>(null)

  /* Le chrome d'annotation — cadres, poignées, caret — ne se dessine que quand
     il a quelque chose à dire : un calque sélectionné, ou un instrument de tracé
     en main. Avec `SEL` et rien de sélectionné, l'état par défaut, le canvas
     montre exactement ce que l'export produira — ce que garantissait l'ancien
     mode Compose — et `Escape` y ramène en un geste. Le `Preview` tient déjà
     cette règle : sans `selectedIds`, il n'affiche ni cadre ni poignée. */

  const inset = narrow ? NARROW_INSET : INSET

  // Largeur d'une fenêtre à l'échelle 1 : l'inspecteur en a besoin pour
  // afficher l'élévation en pixels plutôt qu'en fraction abstraite.
  const windowWidth = useMemo(() => scene.shots[0]?.image.naturalWidth ?? 0, [scene.shots])
  // L'image de tête donne son rapport à la fenêtre : paysage, elle couche un iPhone.
  const lead = scene.shots[0]?.image
  const landscape = lead ? lead.naturalWidth > lead.naturalHeight : false

  const activeShot = shots.find((shot) => shot.id === props.activeShotId) ?? shots[0] ?? null

  const { onCreateAnnotation, onDeleteLayers, onPatchAnnotation, onSelectLayers, onKeys } = props

  /** Un réglage fait à l'inspecteur devient le style de son outil : le prochain
   *  calque du même type le reprend. Les poignées du canvas n'y écrivent pas —
   *  étirer un groupe change des tailles qu'on n'a pas choisies. */
  const patchAnnotation = useCallback(
    (shotId: string, id: string, patch: Partial<Annotation>) => {
      const shot = shots.find((item) => item.id === shotId)
      const annotation = shot ? findAnnotation(shot.layers, id) : null
      if (annotation) rememberToolStyle(annotation.kind, patch)
      onPatchAnnotation(shotId, id, patch)
    },
    [shots, onPatchAnnotation],
  )

  /** Touches nues propres à l'éditeur, avant celles de l'app : le choix d'un
   *  outil, et le dernier cran d'`Escape` — sortir de la saisie (géré par le
   *  champ), puis désélectionner (l'app), puis revenir à la sélection. */
  const keys = useCallback(
    (event: React.KeyboardEvent) => {
      const bare = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey
      const picked = bare ? toolForKey(event.key) : null
      if (picked) {
        event.preventDefault()
        setTool(picked)
        return
      }
      if (event.key === 'Escape' && props.selectedLayerIds.length === 0 && tool !== 'SEL') {
        event.preventDefault()
        setTool('SEL')
        return
      }
      onKeys(event)
    },
    [onKeys, props.selectedLayerIds.length, tool],
  )

  /** Fin de saisie : un label resté vide ne laisse pas de calque fantôme. */
  const closeEdit = useCallback(
    (next: Editing | null) => {
      const previous = editing
      setEditing(next)
      if (!previous || previous.id === next?.id) return
      const shot = shots.find((item) => item.id === previous.shotId)
      const annotation = shot ? findAnnotation(shot.layers, previous.id) : null
      if (annotation && !annotation.text.trim()) onDeleteLayers(previous.shotId, [previous.id])
    },
    [editing, shots, onDeleteLayers],
  )

  const createAnnotation = useCallback(
    (shotId: string, kind: AnnotationKind, rect: FractionRect) => {
      const id = onCreateAnnotation(shotId, kind, rect)
      if (kind === 'text') setEditing({ shotId, id, caret: 0 })
      return id
    },
    [onCreateAnnotation],
  )

  /** ⇧-clic dans le panneau : la plage se lit dans l'ordre affiché, que seul
   *  l'arbre connaît. */
  const selectLayers = useCallback(
    (ids: string[], additive: boolean, range: boolean) => {
      const shotId = activeShot?.id ?? null
      const start = anchor.current

      if (range && start && activeShot) {
        const order = displayOrder(activeShot.layers)
        const from = order.indexOf(start)
        const to = order.indexOf(ids[0])
        if (from >= 0 && to >= 0) {
          onSelectLayers(shotId, order.slice(Math.min(from, to), Math.max(from, to) + 1), false)
          return
        }
      }

      anchor.current = ids[0] ?? null
      onSelectLayers(shotId, ids, additive)
    },
    [activeShot, onSelectLayers],
  )

  const center = { paddingLeft: inset.left, paddingRight: inset.right }
  const sheetLabel = sheetOpen ? m.workspace.editor.closeInspector : m.workspace.editor.openInspector

  return (
    <div className="stage-grain absolute inset-x-0 top-[58px] bottom-0">
      <Preview
        scene={scene}
        inset={inset}
        onKeys={keys}
        tool={ANNOTATION_KIND[tool]}
        selectedIds={props.selectedLayerIds}
        selectedShotId={props.activeShotId}
        editing={editing}
        onCreate={createAnnotation}
        onSelect={(shotId, ids, additive) => {
          anchor.current = ids[0] ?? null
          props.onSelectLayers(shotId, ids, additive)
        }}
        onTranslate={props.onTranslateLayers}
        onDuplicate={(shotId, ids) => props.onDuplicateLayers(shotId, ids, 0)}
        onPlace={props.onPlace}
        onPan={props.onPan}
        onPatch={onPatchAnnotation}
        onEdit={closeEdit}
        onEditText={(shotId, id, text) => onPatchAnnotation(shotId, id, { text })}
      />

      {/* Barre d'outils et barre du document, centrées sur la zone de dessin
          et non sur l'écran : les panneaux latéraux n'ont pas la même largeur. */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center" style={center}>
        <ToolRail active={tool} onPick={setTool} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex flex-col items-center gap-2" style={center}>
        <FirstTips />
        <Panel className="pointer-events-auto flex items-center gap-1 rounded-lg px-2 py-1.5">
          <IconButton icon={UndoIcon} label={m.core.shortcuts.undo} shortcut="⌘Z" tipSide="top" disabled={!props.canUndo} onClick={props.onUndo} />
          <IconButton icon={RedoIcon} label={m.core.shortcuts.redo} shortcut="⇧⌘Z" tipSide="top" disabled={!props.canRedo} onClick={props.onRedo} />
          {props.output && (
            <span className="t-mono-micro px-2 whitespace-nowrap text-dim">
              {props.output.width} × {props.output.height}
            </span>
          )}
        </Panel>
      </div>

      <ImagesPanel
        shots={shots}
        activeId={props.activeShotId}
        members={props.members}
        mode={props.mode}
        queue={props.queue}
        onMode={props.onMode}
        onActivate={props.onActivate}
        onToggleMember={props.onToggleMember}
        onReorder={props.onReorderShots}
        onAdd={props.onAddShot}
        onNewSession={props.onNewSession}
        layers={{
          shot: activeShot,
          selectedIds: props.selectedLayerIds,
          onSelect: selectLayers,
          onPatch: (id, patch) => activeShot && props.onPatchNode(activeShot.id, id, patch),
          onMove: (ids, parentId, index) =>
            activeShot && props.onMoveLayers(activeShot.id, ids, parentId, index),
        }}
      />

      {/* Sous 1100 px l'inspecteur devient une feuille rétractable ancrée à
          droite : il n'y a plus la place de le laisser flotter en permanence. */}
      {narrow && (
        <button
          type="button"
          onClick={() => setSheetOpen((open) => !open)}
          aria-expanded={sheetOpen}
          title={sheetLabel}
          aria-label={sheetLabel}
          className="panel absolute top-4 right-5 z-20 flex size-9 items-center justify-center rounded-md text-ink-soft hover:text-ink"
        >
          {sheetOpen ? <CloseSheetIcon /> : <OpenSheetIcon />}
        </button>
      )}

      {(!narrow || sheetOpen) && (
        <Inspector
          offset={narrow}
          onDeselect={() => props.onSelectLayers(null, [], false)}
          style={props.style}
          layer={
            props.selectedLayerIds.length > 0
              ? {
                  shot: activeShot,
                  selectedIds: props.selectedLayerIds,
                  onPatch: patchAnnotation,
                  onDelete: props.onDeleteLayers,
                  onMove: props.onMoveLayer,
                  onGroup: props.onGroupLayers,
                  onUngroup: props.onUngroupLayer,
                }
              : null
          }
          document={{
            settings: scene.settings,
            composition: scene.composition,
            palette: scene.palette,
            windowWidth,
            landscape,
            combined: props.mode === 'combined',
            activeShot,
            onChange: props.onChange,
            onCompose: props.onCompose,
            onPlace: props.onPlace,
            onPickBackgroundImage: props.onPickBackgroundImage,
          }}
        />
      )}
    </div>
  )
}
