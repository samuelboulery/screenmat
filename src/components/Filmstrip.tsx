import { useRef } from 'react'
import { AddIcon, NewSessionIcon, RedoIcon, UndoIcon } from './icons.tsx'
import { DashedTile, IconButton, Panel } from './ui.tsx'
import type { Format, Shot } from '../types.ts'

type FilmstripProps = {
  shots: readonly Shot[]
  activeId: string
  /** Shots retenus dans la composition (écran Layouts). */
  selection?: readonly string[]
  onSelect: (id: string, additive: boolean) => void
  onAdd: () => void
  onReorder: (from: number, to: number) => void
  /** Docké en bas de la scène plutôt que flottant et centré. */
  docked?: boolean
  hint?: string
  /* --- Groupe « document ». Descendu de la barre haute : ces trois-là
     décrivent ou manipulent le document, pas la navigation. Facultatif en bloc
     — un filmstrip sans `onUndo` ne le rend pas. --- */
  /** Dimensions de sortie, déjà multipliées par l'échelle. */
  output?: { width: number; height: number; format: Format } | null
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onNewSession?: () => void
}

/** Filet de séparation, celui déjà en place entre vignettes et hint. */
function Divider() {
  return <span className="h-7 w-px shrink-0 bg-hairline" />
}

/**
 * Bande de shots. Les vignettes sont des `<img>` : c'est un sélecteur, pas
 * l'artwork — le chemin de rendu unique ne concerne que le visuel exporté.
 */
export default function Filmstrip({
  shots,
  activeId,
  selection,
  onSelect,
  onAdd,
  onReorder,
  docked = false,
  hint = '⌘V to add · drag to reorder',
  output,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onNewSession,
}: FilmstripProps) {
  const dragged = useRef<number | null>(null)
  const size = docked ? 'h-[42px] w-[66px]' : 'h-10 w-[62px]'

  return (
    <Panel
      className={
        docked
          ? 'absolute right-[328px] bottom-6 left-24 z-10 flex items-center gap-3 rounded-lg px-3.5 py-2.5'
          : // Le groupe « document » a élargi le panneau : le borner à la scène
            // pour qu'une file de vignettes ne le pousse jamais hors de l'écran.
            'absolute bottom-[22px] left-1/2 z-10 flex max-w-[calc(100%-40px)] -translate-x-1/2 items-center gap-3 px-3 py-2.5'
      }
    >
      {/* `p-1` compensé par `-m-1` : l'anneau de sélection déborde de 3 px
          (1,5 px de trait + 1,5 px d'offset) et `overflow-x-auto` le rognerait.
          La marge négative rend la place prise, la mise en page ne bouge pas. */}
      <div className="-m-1 flex min-w-0 items-center gap-2 overflow-x-auto p-1">
        {shots.map((shot, index) => {
          const included = selection ? selection.includes(shot.id) : shot.id === activeId
          return (
            <button
              key={shot.id}
              type="button"
              draggable
              title={shot.name}
              aria-pressed={included}
              onDragStart={() => {
                dragged.current = index
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragged.current !== null && dragged.current !== index) {
                  onReorder(dragged.current, index)
                }
                dragged.current = null
              }}
              onClick={(event) => onSelect(shot.id, event.metaKey || event.shiftKey)}
              className={`shrink-0 overflow-hidden rounded-sm border border-hairline bg-sunken ${size} ${
                included ? 'ring-selected' : ''
              }`}
            >
              <img src={shot.image.src} alt="" className="size-full object-cover" />
            </button>
          )
        })}

        <DashedTile
          onClick={onAdd}
          className={`shrink-0 ${size}`}
          title="Add a shot"
          aria-label="Add a shot"
        >
          <AddIcon />
        </DashedTile>
      </div>

      <Divider />
      <span className="t-mono-micro shrink-0 text-dim">{hint}</span>

      {onUndo && (
        <>
          <Divider />
          <div className="flex shrink-0 items-center gap-1">
            <IconButton icon={UndoIcon} label="Undo (⌘Z)" disabled={!canUndo} onClick={onUndo} />
            <IconButton icon={RedoIcon} label="Redo (⇧⌘Z)" disabled={!canRedo} onClick={onRedo} />
          </div>

          {/* Métadonnée annexe : elle tombe avant que le panneau ne déborde. */}
          {output && (
            <span className="t-mono-micro shrink-0 whitespace-nowrap text-dim max-[1180px]:hidden">
              {output.width} × {output.height} · {output.format}
            </span>
          )}

          {onNewSession && (
            <>
              <Divider />
              <IconButton
                icon={NewSessionIcon}
                label="New session"
                onClick={onNewSession}
                className="shrink-0"
              />
            </>
          )}
        </>
      )}
    </Panel>
  )
}
