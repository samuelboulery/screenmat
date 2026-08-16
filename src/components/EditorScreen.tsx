import { useMemo, useState } from 'react'
import AnnotateInspector from './AnnotateInspector.tsx'
import Filmstrip from './Filmstrip.tsx'
import Inspector from './Inspector.tsx'
import Preview from './Preview.tsx'
import ToolRail, { ANNOTATE_TOOLS, COMPOSE_TOOLS, type AnnotateTool, type ComposeTool } from './ToolRail.tsx'
import type { Mode } from './TopBar.tsx'
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
  selectedAnnotationId: string | null
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
  onCreateAnnotation: (shotId: string, kind: AnnotationKind, rect: FractionRect) => void
  onPatchAnnotation: (shotId: string, id: string, patch: Partial<Annotation>) => void
  onDeleteAnnotation: (shotId: string, id: string) => void
  onMoveAnnotation: (shotId: string, id: string, direction: 'up' | 'down') => void
  onSelectAnnotation: (shotId: string | null, id: string | null) => void
}

export default function EditorScreen(props: EditorScreenProps) {
  const { mode, scene, shots, narrow } = props
  const [composeTool, setComposeTool] = useState<ComposeTool>('FRM')
  const [annotateTool, setAnnotateTool] = useState<AnnotateTool>('SEL')
  const [sheetOpen, setSheetOpen] = useState(false)

  const annotating = mode === 'annotate'
  const docked = !annotating && scene.composition.layout !== 'single' && shots.length > 1
  const inset = narrow ? NARROW_INSET : INSET

  // Largeur d'une fenêtre à l'échelle 1 : l'inspecteur en a besoin pour
  // afficher l'élévation en pixels plutôt qu'en fraction abstraite.
  const windowWidth = useMemo(() => scene.shots[0]?.image.naturalWidth ?? 0, [scene.shots])

  const activeShot = shots.find((shot) => shot.id === props.activeShotId) ?? shots[0] ?? null

  return (
    <div className="stage-glow absolute inset-x-0 top-[58px] bottom-0">
      <Preview
        scene={scene}
        inset={inset}
        tool={annotating ? ANNOTATION_KIND[annotateTool] : null}
        // Les poignées n'appartiennent qu'au mode annotation : en compose, le
        // canvas doit montrer exactement ce que l'export produira.
        selectedId={annotating ? props.selectedAnnotationId : null}
        selectedShotId={props.activeShotId}
        onCreate={props.onCreateAnnotation}
        onSelect={props.onSelectAnnotation}
        onUpdate={(shotId, id, rect) => props.onPatchAnnotation(shotId, id, { rect })}
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
            selectedId={props.selectedAnnotationId}
            onSelect={(id) => props.onSelectAnnotation(activeShot?.id ?? null, id)}
            onPatch={props.onPatchAnnotation}
            onDelete={props.onDeleteAnnotation}
            onMove={props.onMoveAnnotation}
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
