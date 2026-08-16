import { useCallback, useMemo, useRef, useState } from 'react'
import AnnotateInspector from './AnnotateInspector.tsx'
import Filmstrip from './Filmstrip.tsx'
import Inspector from './Inspector.tsx'
import Preview, { type Editing } from './Preview.tsx'
import ToolRail, { ANNOTATE_TOOLS, COMPOSE_TOOLS, type AnnotateTool, type ComposeTool } from './ToolRail.tsx'
import type { Mode } from './TopBar.tsx'
import { displayOrder, findAnnotation } from '../lib/tree.ts'
import type { NodePatch } from '../hooks/useShots.ts'
import type { Annotation, AnnotationKind, Composition, FractionRect, Scene, Settings, Shot, Style } from '../types.ts'

/** Les panneaux flottent au-dessus du canvas : la boîte disponible est réduite
 *  d'autant. `[96, 328]` d'inset horizontal, comme spécifié dans le handoff. */
const INSET = { left: 96, right: 328, top: 8, bottom: 110 }
/** Sous 1100 px : le rail occupe une barre horizontale de 64 px en haut. */
const NARROW_INSET = { left: 20, right: 20, top: 72, bottom: 110 }

const ANNOTATION_KIND: Record<AnnotateTool, AnnotationKind | 'select'> = {
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
  mode: Extract<Mode, 'compose' | 'annotate'>
  scene: Scene
  shots: readonly Shot[]
  activeShotId: string
  selection: readonly string[]
  styles: readonly Style[]
  activeStyleId: string | null
  selectedLayerIds: readonly string[]
  /** Vrai sous 1100 px : le rail passe à l'horizontale, l'inspecteur se replie. */
  narrow: boolean
  onChange: (patch: Partial<Settings>) => void
  onCompose: (patch: Partial<Composition>) => void
  onSelectShot: (id: string, additive: boolean) => void
  onReorderShots: (from: number, to: number) => void
  onAddShot: () => void
  onApplyStyle: (id: string) => void
  onSaveStyle: () => void
  onPickBackgroundImage: () => void
  onCreateAnnotation: (shotId: string, kind: AnnotationKind, rect: FractionRect) => string
  onPatchAnnotation: (shotId: string, id: string, patch: Partial<Annotation>) => void
  onPatchNode: (shotId: string, id: string, patch: NodePatch) => void
  onTranslateLayers: (shotId: string, ids: readonly string[], dx: number, dy: number) => void
  onDeleteLayers: (shotId: string, ids: readonly string[]) => void
  onMoveLayer: (shotId: string, id: string, direction: 'up' | 'down') => void
  onMoveLayers: (shotId: string, ids: readonly string[], parentId: string | null, index: number) => void
  onGroupLayers: (shotId: string, ids: readonly string[]) => void
  onUngroupLayer: (shotId: string, groupId: string) => void
  onSelectLayers: (shotId: string | null, ids: readonly string[], additive: boolean) => void
}

export default function EditorScreen(props: EditorScreenProps) {
  const { mode, scene, shots, narrow } = props
  const [composeTool, setComposeTool] = useState<ComposeTool>('FRM')
  const [annotateTool, setAnnotateTool] = useState<AnnotateTool>('SEL')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Editing | null>(null)
  /** Point d'ancrage d'une sélection de plage (⇧-clic dans le panneau). */
  const anchor = useRef<string | null>(null)

  const annotating = mode === 'annotate'
  const docked = !annotating && scene.composition.layout !== 'single' && shots.length > 1
  const inset = narrow ? NARROW_INSET : INSET

  // Largeur d'une fenêtre à l'échelle 1 : l'inspecteur en a besoin pour
  // afficher l'élévation en pixels plutôt qu'en fraction abstraite.
  const windowWidth = useMemo(() => scene.shots[0]?.image.naturalWidth ?? 0, [scene.shots])

  const activeShot = shots.find((shot) => shot.id === props.activeShotId) ?? shots[0] ?? null

  const { onCreateAnnotation, onDeleteLayers, onSelectLayers } = props

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

  return (
    <div className="stage-glow absolute inset-x-0 top-[58px] bottom-0">
      <Preview
        scene={scene}
        inset={inset}
        tool={annotating ? ANNOTATION_KIND[annotateTool] : null}
        // Les poignées n'appartiennent qu'au mode annotation : en compose, le
        // canvas doit montrer exactement ce que l'export produira.
        selectedIds={annotating ? props.selectedLayerIds : []}
        selectedShotId={props.activeShotId}
        editing={annotating ? editing : null}
        onCreate={createAnnotation}
        onSelect={(shotId, ids, additive) => {
          anchor.current = ids[0] ?? null
          props.onSelectLayers(shotId, ids, additive)
        }}
        onTranslate={props.onTranslateLayers}
        onResize={(shotId, id, rect) => props.onPatchAnnotation(shotId, id, { rect })}
        onEdit={closeEdit}
        onEditText={(shotId, id, text) => props.onPatchAnnotation(shotId, id, { text })}
      />

      {annotating ? (
        <ToolRail
          tools={ANNOTATE_TOOLS}
          active={annotateTool}
          onPick={setAnnotateTool}
          horizontal={narrow}
        />
      ) : (
        <ToolRail
          tools={COMPOSE_TOOLS}
          active={composeTool}
          onPick={setComposeTool}
          horizontal={narrow}
        />
      )}

      {/* Sous 1100 px l'inspecteur devient une feuille rétractable ancrée à
          droite : il n'y a plus la place de le laisser flotter en permanence. */}
      {narrow && (
        <button
          type="button"
          onClick={() => setSheetOpen((open) => !open)}
          aria-expanded={sheetOpen}
          className="panel absolute top-[76px] right-5 z-20 rounded-[10px] px-3 py-2 font-mono text-[10px] tracking-[0.18em] text-ink-soft uppercase"
        >
          {sheetOpen ? 'Close ›' : '‹ Inspect'}
        </button>
      )}

      {(!narrow || sheetOpen) &&
        (annotating ? (
          <AnnotateInspector
            shot={activeShot}
            selectedIds={props.selectedLayerIds}
            onSelect={selectLayers}
            onPatch={props.onPatchAnnotation}
            onPatchNode={props.onPatchNode}
            onDelete={props.onDeleteLayers}
            onMove={props.onMoveLayer}
            onMoveTo={props.onMoveLayers}
            onGroup={props.onGroupLayers}
            onUngroup={props.onUngroupLayer}
            offset={narrow}
          />
        ) : (
          <Inspector
            tool={composeTool}
            settings={scene.settings}
            composition={scene.composition}
            palette={scene.palette}
            styles={props.styles}
            activeStyleId={props.activeStyleId}
            windowWidth={windowWidth}
            onChange={props.onChange}
            onCompose={props.onCompose}
            onApplyStyle={props.onApplyStyle}
            onSaveStyle={props.onSaveStyle}
            onPickBackgroundImage={props.onPickBackgroundImage}
            offset={narrow}
          />
        ))}

      <Filmstrip
        shots={shots}
        activeId={props.activeShotId}
        selection={docked ? props.selection : undefined}
        docked={docked}
        onSelect={props.onSelectShot}
        onAdd={props.onAddShot}
        onReorder={props.onReorderShots}
        hint={
          docked
            ? `${props.selection.length} of ${shots.length} shots in composition`
            : '⌘V to add · drag to reorder'
        }
      />
    </div>
  )
}
