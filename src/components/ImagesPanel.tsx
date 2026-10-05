import { useRef } from 'react'
import LayersPanel, { type LayersPanelProps } from './LayersPanel.tsx'
import { AddIcon, CaptureTabIcon, NewSessionIcon } from './icons.tsx'
import { CheckBox, IconButton, Panel, SELECTED, Section, Segmented } from './ui.tsx'
import type { OutputMode, QueueItem, Shot } from '../types.ts'
import { m } from '../lib/i18n/index.ts'
import { MAC, keyLabel } from '../lib/keys.ts'

type ImagesPanelProps = {
  shots: readonly Shot[]
  activeId: string
  /** Images retenues dans la composition, en mode combiné. */
  members: readonly string[]
  mode: OutputMode
  /** État de chaque image dans le lot en cours d'export, s'il y en a un. */
  queue: readonly QueueItem[]
  onMode: (mode: OutputMode) => void
  onActivate: (id: string) => void
  onToggleMember: (id: string) => void
  onReorder: (from: number, to: number) => void
  onAdd: () => void
  /** Absent là où le navigateur ne sait pas partager un onglet. */
  onCaptureTab?: () => void
  onNewSession: () => void
  layers: LayersPanelProps
}

/**
 * Le panneau gauche : les images de la session, puis les calques de l'image
 * active. Cliquer une image l'ouvre, jamais ne vide la sélection du lot ; en
 * mode combiné, la case dit si elle entre dans la composition. Les vignettes
 * sont des `<img>` : c'est un sélecteur, pas l'artwork.
 */
export default function ImagesPanel(props: ImagesPanelProps) {
  const { shots, activeId, members, mode } = props
  const dragged = useRef<number | null>(null)
  const combined = mode === 'combined'
  const modes = [
    { value: 'separate', label: m.workspace.images.separate, title: m.workspace.images.onePerImage },
    { value: 'combined', label: m.workspace.images.combined, title: m.workspace.images.combinedHint },
  ] as const

  return (
    <Panel className="absolute top-4 bottom-4 left-5 z-10 flex w-60 flex-col gap-4 overflow-hidden p-4">
      <Section
        title={m.workspace.images.heading(shots.length)}
        aside={
          <div className="flex items-center gap-1">
            {props.onCaptureTab && (
              <IconButton icon={CaptureTabIcon} label={m.workspace.images.captureTab} onClick={props.onCaptureTab} />
            )}
            <IconButton icon={AddIcon} label={keyLabel(m.workspace.images.add, MAC)} onClick={props.onAdd} />
          </div>
        }
      >
        {shots.length > 1 && (
          <Segmented className="w-full" options={modes} value={mode} onPick={props.onMode} />
        )}
        <ul className="-m-1 max-h-[38vh] space-y-1 overflow-y-auto p-1">
          {shots.map((shot, index) => {
            const status = props.queue.find((item) => item.shotId === shot.id)?.status
            const member = members.includes(shot.id)
            return (
              <li
                key={shot.id}
                draggable
                onDragStart={() => {
                  dragged.current = index
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragged.current !== null && dragged.current !== index) {
                    props.onReorder(dragged.current, index)
                  }
                  dragged.current = null
                }}
                className="flex items-center gap-1.5"
              >
                {combined && (
                  <button
                    type="button"
                    aria-pressed={member}
                    title={member ? m.workspace.images.removeMember : m.workspace.images.addMember}
                    aria-label={m.workspace.images.member(shot.name)}
                    onClick={() => props.onToggleMember(shot.id)}
                    className="flex size-6 shrink-0 items-center justify-center"
                  >
                    <CheckBox checked={member} />
                  </button>
                )}
                <button
                  type="button"
                  aria-current={shot.id === activeId}
                  title={shot.name}
                  onClick={() => props.onActivate(shot.id)}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-md border p-1.5 text-left transition-colors duration-140 ${
                    shot.id === activeId
                      ? SELECTED
                      : 'border-transparent text-ink-soft hover:bg-ink/[.03] hover:text-ink'
                  }`}
                >
                  <img
                    src={shot.image.src}
                    alt=""
                    className="h-7 w-11 shrink-0 rounded-xs border border-hairline object-cover"
                  />
                  <span className="t-ui min-w-0 flex-1 truncate">{shot.name}</span>
                  {status && status !== 'queued' && (
                    <span className="t-mono-micro shrink-0 text-dim">{status}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </Section>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-hairline pt-4">
        <LayersPanel {...props.layers} />
      </div>

      <div className="flex items-center justify-between border-t border-hairline pt-3">
        <span className="t-mono-micro text-dim">
          {combined ? m.workspace.images.combinedCount(members.length, shots.length) : m.workspace.images.onePerImage}
        </span>
        <IconButton icon={NewSessionIcon} label={m.workspace.images.newSession} onClick={props.onNewSession} />
      </div>
    </Panel>
  )
}
