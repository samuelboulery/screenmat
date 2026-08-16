import type { ReactNode } from 'react'
import { AddIcon, CheckIcon, LocalIcon, WarningIcon } from './icons.tsx'
import { Badge, DashedTile, MonoLabel, Panel, Section, Segmented } from './ui.tsx'
import type { Format, QueueItem, Ratio, Shot, Style } from '../types.ts'

const RATIOS: Ratio[] = ['16:9', '4:3', '1:1', '9:16']

/** Ligne à cocher du panneau : un ratio, une option. */
function CheckRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors duration-140 ${
        checked ? 'border-accent/30 bg-accent/10' : 'border-transparent hover:bg-white/[.03]'
      }`}
    >
      <span
        className={`flex size-[15px] shrink-0 items-center justify-center rounded-xs ${
          checked ? 'bg-accent text-stage' : 'border-[1.5px] border-white/20'
        }`}
      >
        {checked && <CheckIcon className="size-2.5" />}
      </span>
      {children}
    </button>
  )
}

const STATUS_LABEL: Record<QueueItem['status'], string> = {
  queued: 'queued',
  rendering: 'rendering',
  done: 'done',
  skipped: 'skipped',
  error: 'error',
}

type BatchScreenProps = {
  shots: readonly Shot[]
  selection: readonly string[]
  queue: readonly QueueItem[]
  rendered: number
  total: number
  style: Style | null
  ratios: readonly Ratio[]
  scale: number
  format: Format
  harmonize: boolean
  onToggleShot: (id: string) => void
  onToggleRatio: (ratio: Ratio) => void
  onScale: (scale: number) => void
  onFormat: (format: Format) => void
  onHarmonize: (harmonize: boolean) => void
  onAddShot: () => void
  onChangeStyle: () => void
  /** Sous 1100 px : le panneau passe sous la grille au lieu d'être docké. */
  narrow?: boolean
}

/**
 * Écran de gestion, pas de composition : l'inspecteur y est docké et non
 * flottant, et la grille prend toute la place.
 */
export default function BatchScreen({
  shots,
  selection,
  queue,
  rendered,
  total,
  style,
  ratios,
  scale,
  format,
  harmonize,
  onToggleShot,
  onToggleRatio,
  onScale,
  onFormat,
  onHarmonize,
  onAddShot,
  onChangeStyle,
  narrow = false,
}: BatchScreenProps) {
  const byShot = new Map(queue.map((item) => [item.shotId, item]))
  const progress = total > 0 ? (rendered / total) * 100 : 0

  return (
    <div
      className={`stage-glow absolute inset-x-0 top-[58px] bottom-0 flex overflow-hidden ${
        narrow ? 'flex-col overflow-y-auto' : ''
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-7">
        <div className="flex items-center gap-4">
          <MonoLabel>Queue</MonoLabel>
          <div
            role="progressbar"
            aria-label="Batch render progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={rendered}
            className="h-1 w-full max-w-[300px] overflow-hidden rounded-xs bg-white/[.09]"
          >
            <div className="gradient-accent h-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono text-[10px] text-dim">
            {rendered} / {total} rendered
          </span>
        </div>

        <div className={`grid gap-4 ${narrow ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {shots.map((shot, index) => {
            const picked = selection.includes(shot.id)
            const item = byShot.get(shot.id)
            const status = picked ? (item?.status ?? 'queued') : 'skipped'

            return (
              <button
                key={shot.id}
                type="button"
                onClick={() => onToggleShot(shot.id)}
                aria-pressed={picked}
                className={`relative h-[148px] overflow-hidden rounded-lg border border-hairline text-left ${
                  picked ? 'bg-sunken' : 'bg-white/[.04]'
                }`}
              >
                {/* L'atténuation ne porte que sur l'image : posée sur le bouton,
                    elle emmenait le statut à 1,2:1 par-dessus un screenshot
                    clair — soit le texte que cet écran existe pour donner. */}
                <img
                  src={shot.image.src}
                  alt=""
                  className={`size-full object-cover ${picked ? '' : 'opacity-50'}`}
                />

                <span
                  className={`absolute top-2.5 left-2.5 flex size-4 items-center justify-center rounded-xs ${
                    picked ? 'bg-accent text-stage' : 'border-[1.5px] border-white/40'
                  }`}
                >
                  {picked && <CheckIcon className="size-3" />}
                </span>

                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-stage/85 px-2.5 py-2 font-mono text-[10px] text-ink">
                  <span>
                    {String(index + 1).padStart(2, '0')} · {STATUS_LABEL[status]}
                  </span>
                  {item?.error && <WarningIcon className="size-3 text-danger" />}
                </span>

                {status === 'rendering' && (
                  <span
                    className="gradient-accent absolute bottom-0 left-0 h-0.5"
                    style={{ width: `${(item?.progress ?? 0) * 100}%` }}
                  />
                )}
              </button>
            )
          })}

          <DashedTile onClick={onAddShot} className="h-[148px] flex-col gap-1.5 rounded-lg font-mono text-[10px]">
            <AddIcon />
            add
          </DashedTile>
        </div>

        <div className="flex items-center gap-2.5 rounded-md border border-accent/20 bg-accent/[.06] px-3.5 py-2.5">
          <Badge tone="accent">
            <span className="flex items-center gap-1">
              <LocalIcon className="size-3" /> OFFLINE
            </span>
          </Badge>
          <span className="t-ui text-accent-ink">
            Everything renders on this machine. No file is ever uploaded.
          </span>
        </div>
      </div>

      <Panel
        className={`space-y-5 overflow-y-auto rounded-none border-0 p-6 ${
          narrow ? 'w-full border-t border-white/5' : 'w-[316px] shrink-0 border-l border-white/5'
        }`}
      >
        <Section title="Style applied" aside={<button type="button" onClick={onChangeStyle} className="t-ui-small text-accent hover:underline">Change</button>}>
          <div className="flex items-center gap-2.5">
            <span className="h-[22px] w-[30px] rounded-xs border border-hairline bg-sunken" />
            <span className="t-ui text-ink">{style?.name ?? 'Current settings'}</span>
          </div>
        </Section>

        <Section title="Ratio set">
          <div className="space-y-1">
            {RATIOS.map((ratio) => (
              <CheckRow
                key={ratio}
                checked={ratios.includes(ratio)}
                onToggle={() => onToggleRatio(ratio)}
              >
                <span className="t-ui text-ink">{ratio}</span>
              </CheckRow>
            ))}
          </div>
        </Section>

        <Section title="Consistency">
          <CheckRow checked={harmonize} onToggle={() => onHarmonize(!harmonize)}>
            <span className="t-ui text-ink">Harmonize backgrounds</span>
          </CheckRow>
          <p className="px-2.5 font-mono text-[10px] leading-[1.5] text-dim">
            Same saturation and contrast across the batch. Each shot keeps its own hue.
          </p>
        </Section>

        <Section title="Output">
          <Segmented
            className="w-full"
            options={[
              { value: '1', label: '1×' },
              { value: '2', label: '2×' },
              { value: '3', label: '3×' },
            ]}
            value={String(scale)}
            onPick={(value) => onScale(Number(value))}
          />
          <Segmented
            className="w-full"
            options={[
              { value: 'webp', label: 'WebP' },
              { value: 'png', label: 'PNG' },
            ]}
            value={format}
            onPick={onFormat}
          />
          <p className="font-mono text-[10px] text-dim">
            NAMING {'{shot}-{ratio}'}@{scale}x
          </p>
          <p className="font-mono text-[10px] text-dim">DEST shotframe-batch.zip</p>
        </Section>
      </Panel>
    </div>
  )
}
