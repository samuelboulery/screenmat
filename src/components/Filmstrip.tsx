import { useRef } from 'react'
import {
  AddIcon,
  CopiedIcon,
  CopyIcon,
  ExportIcon,
  NewSessionIcon,
  RedoIcon,
  UndoIcon,
} from './icons.tsx'
import { Button, DashedTile, IconButton, Panel, Segmented } from './ui.tsx'
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
  /** Un état, jamais un mode d'emploi : « 2 of 5 shots in composition ». */
  hint?: string
  /* --- Groupe « document ». Descendu de la barre haute : ces trois-là
     décrivent ou manipulent le document, pas la navigation. Facultatif en bloc
     — un filmstrip sans `onUndo` ne le rend pas. --- */
  /** Dimensions de sortie, déjà multipliées par l'échelle. */
  output?: { width: number; height: number; format: Format } | null
  /* --- Ce que l'export va produire. Ces deux réglages vivaient dans
     l'inspecteur, à six sections du bouton qu'ils décrivent ; l'échelle, elle,
     ne s'atteignait qu'aux touches 1/2/3. --- */
  scale?: number
  onScale?: (scale: number) => void
  onFormat?: (format: Format) => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onNewSession?: () => void
  /* --- Fin de course. Elles aussi appartiennent au document : les laisser dans
     la barre haute y faisait entrer et sortir des boutons à chaque écran. --- */
  copied?: boolean
  onCopy?: () => void
  onExport?: () => void
}

/** Les échelles d'export, en toutes lettres : `useShortcuts` pose les mêmes
 *  sur 1/2/3, et les deux doivent dire la même chose. */
const SCALES = [
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
  { value: '3', label: '3×' },
] as const

const FORMATS: ReadonlyArray<{ value: Format; label: string }> = [
  { value: 'webp', label: 'WebP' },
  { value: 'png', label: 'PNG' },
]

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
  hint,
  output,
  scale,
  onScale,
  onFormat,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onNewSession,
  copied = false,
  onCopy,
  onExport,
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
      <div className="-m-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto p-1">
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

      {/* Un hint n'existe que s'il dit un état — combien de shots la composition
          retient. Le mode d'emploi (« ⌘V to add · drag to reorder ») a été
          retiré : il volait la place aux vignettes, qui, elles, montrent. */}
      {hint && (
        <>
          <Divider />
          <span className="t-mono-micro shrink-0 text-dim">{hint}</span>
        </>
      )}

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
              {output.width} × {output.height}
            </span>
          )}

          {/* Le format n'est plus écrit à côté des dimensions : le commutateur
              le dit déjà, et le répéter serait la redondance qu'on retire. */}
          {output && onScale && onFormat && (
            <div className="flex shrink-0 items-center gap-1.5 max-[1180px]:hidden">
              <Segmented
                options={SCALES}
                value={String(scale ?? 2)}
                onPick={(value) => onScale(Number(value))}
              />
              <Segmented
                options={FORMATS}
                value={output.format}
                onPick={(format) => onFormat(format)}
              />
            </div>
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

      {onExport && (
        <>
          <Divider />
          {/* Le mot tombe sous 1180 px, comme le reste du panneau — mais un mot
              masqué en `display:none` sort aussi du nom accessible : d'où
              `aria-label`, qui ne bouge pas avec la largeur. */}
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={onCopy} title="Copy (⌘C)" aria-label="Copy (⌘C)">
              {copied ? <CopiedIcon /> : <CopyIcon />}
              <span className="max-[1180px]:hidden">{copied ? 'Copied' : 'Copy'}</span>
            </Button>
            <Button
              variant="primary"
              onClick={onExport}
              title="Export (⌘E)"
              aria-label="Export (⌘E)"
            >
              <ExportIcon />
              <span className="max-[1180px]:hidden">Export</span>
            </Button>
          </div>
        </>
      )}
    </Panel>
  )
}
