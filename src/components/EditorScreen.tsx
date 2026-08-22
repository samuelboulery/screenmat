import { useCallback, useMemo, useRef, useState } from 'react'
import Filmstrip from './Filmstrip.tsx'
import { CloseSheetIcon, OpenSheetIcon } from './icons.tsx'
import Inspector from './Inspector.tsx'
import Preview, { type Editing } from './Preview.tsx'
import ToolRail, { type Tool } from './ToolRail.tsx'
import { displayOrder, findAnnotation } from '../lib/tree.ts'
import type { NodePatch } from '../hooks/useShots.ts'
import type {
  Annotation,
  AnnotationKind,
  Composition,
  Format,
  FractionRect,
  Placement,
  Scene,
  Settings,
  Shot,
  Style,
} from '../types.ts'

/** Les panneaux flottent au-dessus du canvas : la boîte disponible est réduite
 *  d'autant. `[96, 328]` d'inset horizontal, comme spécifié dans le handoff. */
const INSET = { left: 96, right: 328, top: 8, bottom: 110 }
/** Sous 1100 px : le rail occupe une barre horizontale de 64 px en haut. */
const NARROW_INSET = { left: 20, right: 20, top: 72, bottom: 110 }

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
  selection: readonly string[]
  styles: readonly Style[]
  activeStyleId: string | null
  selectedLayerIds: readonly string[]
  /** Vrai sous 1100 px : le rail passe à l'horizontale, l'inspecteur se replie. */
  narrow: boolean
  /** Dimensions de sortie, affichées par le filmstrip. */
  output: { width: number; height: number; format: Format } | null
  canUndo: boolean
  canRedo: boolean
  copied: boolean
  onUndo: () => void
  onRedo: () => void
  onNewSession: () => void
  onCopy: () => void
  onExport: () => void
  /** Touches nues de l'édition, à poser sur le canvas — voir `useShortcuts`. */
  onKeys: (event: React.KeyboardEvent) => void
  onChange: (patch: Partial<Settings>) => void
  onCompose: (patch: Partial<Composition>) => void
  onPlace: (shotId: string, patch: Partial<Placement>) => void
  /** Échelle d'export, réglée depuis le filmstrip comme aux touches 1/2/3. */
  scale: number
  onScale: (scale: number) => void
  onSelectShot: (id: string, additive: boolean) => void
  onReorderShots: (from: number, to: number) => void
  onAddShot: () => void
  onApplyStyle: (id: string) => void
  onSaveStyle: () => void
  onUpdateStyle: () => void
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
  const { scene, shots, narrow } = props
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

  const docked = scene.composition.layout !== 'single' && shots.length > 1
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
        onKeys={props.onKeys}
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
        onPlace={props.onPlace}
        onResize={(shotId, id, rect) => props.onPatchAnnotation(shotId, id, { rect })}
        onEdit={closeEdit}
        onEditText={(shotId, id, text) => props.onPatchAnnotation(shotId, id, { text })}
      />

      <ToolRail active={tool} onPick={setTool} horizontal={narrow} />

      {/* Sous 1100 px l'inspecteur devient une feuille rétractable ancrée à
          droite : il n'y a plus la place de le laisser flotter en permanence. */}
      {narrow && (
        <button
          type="button"
          onClick={() => setSheetOpen((open) => !open)}
          aria-expanded={sheetOpen}
          title={sheetOpen ? 'Close the inspector' : 'Open the inspector'}
          aria-label={sheetOpen ? 'Close the inspector' : 'Open the inspector'}
          className="panel absolute top-[76px] right-5 z-20 flex size-9 items-center justify-center rounded-md text-ink-soft hover:text-ink"
        >
          {sheetOpen ? <CloseSheetIcon /> : <OpenSheetIcon />}
        </button>
      )}

      {(!narrow || sheetOpen) && (
        <Inspector
          settings={scene.settings}
          composition={scene.composition}
          palette={scene.palette}
          styles={props.styles}
          activeStyleId={props.activeStyleId}
          windowWidth={windowWidth}
          shotCount={shots.length}
          activeShot={activeShot}
          selectedLayerIds={props.selectedLayerIds}
          onSelectLayers={selectLayers}
          onPatchAnnotation={props.onPatchAnnotation}
          onPatchNode={props.onPatchNode}
          onDeleteLayers={props.onDeleteLayers}
          onMoveLayer={props.onMoveLayer}
          onMoveLayers={props.onMoveLayers}
          onGroupLayers={props.onGroupLayers}
          onUngroupLayer={props.onUngroupLayer}
          onChange={props.onChange}
          onCompose={props.onCompose}
          onPlace={props.onPlace}
          onApplyStyle={props.onApplyStyle}
          onSaveStyle={props.onSaveStyle}
          onUpdateStyle={props.onUpdateStyle}
          onPickBackgroundImage={props.onPickBackgroundImage}
          offset={narrow}
        />
      )}

      <Filmstrip
        shots={shots}
        activeId={props.activeShotId}
        selection={docked ? props.selection : undefined}
        docked={docked}
        onSelect={props.onSelectShot}
        onAdd={props.onAddShot}
        onReorder={props.onReorderShots}
        output={props.output}
        scale={props.scale}
        onScale={props.onScale}
        onFormat={(format) => props.onChange({ format })}
        canUndo={props.canUndo}
        canRedo={props.canRedo}
        onUndo={props.onUndo}
        onRedo={props.onRedo}
        onNewSession={props.onNewSession}
        copied={props.copied}
        onCopy={props.onCopy}
        onExport={props.onExport}
        hint={
          docked ? `${props.selection.length} of ${shots.length} shots in composition` : undefined
        }
      />
    </div>
  )
}
