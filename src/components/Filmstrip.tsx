import { useRef } from 'react'
import { AddIcon } from './icons.tsx'
import { DashedTile, Panel } from './ui.tsx'
import type { Shot } from '../types.ts'

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
}: FilmstripProps) {
  const dragged = useRef<number | null>(null)
  const size = docked ? 'h-[42px] w-[66px]' : 'h-10 w-[62px]'

  return (
    <Panel
      className={
        docked
          ? 'absolute right-[328px] bottom-6 left-24 z-10 flex items-center gap-3 rounded-lg px-3.5 py-2.5'
          : 'absolute bottom-[22px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 px-3 py-2.5'
      }
    >
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
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

      <span className="h-7 w-px shrink-0 bg-hairline" />
      <span className="t-mono-micro shrink-0 text-dim">{hint}</span>
    </Panel>
  )
}
