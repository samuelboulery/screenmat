import { Badge, DashedTile, MonoLabel, Panel, Section, Segmented } from './ui.tsx'
import type { Format, QueueItem, Ratio, Shot, Style } from '../types.ts'

const RATIOS: Ratio[] = ['16:9', '4:3', '1:1', '9:16']

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
  onToggleShot: (id: string) => void
  onToggleRatio: (ratio: Ratio) => void
  onScale: (scale: number) => void
  onFormat: (format: Format) => void
  onAddShot: () => void
  onChangeStyle: () => void
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
  onToggleShot,
  onToggleRatio,
  onScale,
  onFormat,
  onAddShot,
  onChangeStyle,
}: BatchScreenProps) {
  const byShot = new Map(queue.map((item) => [item.shotId, item]))
  const progress = total > 0 ? (rendered / total) * 100 : 0

  return (
    <div className="stage-glow absolute inset-x-0 top-[58px] bottom-0 flex overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-[18px] overflow-y-auto p-[26px_28px]">
        <div className="flex items-center gap-4">
          <MonoLabel>Queue</MonoLabel>
          <div className="h-1 w-full max-w-[300px] overflow-hidden rounded-[3px] bg-white/[.09]">
            <div className="gradient-accent h-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono text-[10px] text-dim">
            {rendered} / {total} rendered
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4">
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
                className={`relative h-[148px] overflow-hidden rounded-xl border border-hairline text-left ${
                  picked ? 'bg-sunken' : 'bg-white/[.04] opacity-60'
                }`}
              >
                <img src={shot.image.src} alt="" className="size-full object-cover" />

                <span
                  className={`absolute top-2.5 left-2.5 size-4 rounded-[5px] ${
                    picked ? 'bg-accent' : 'border-[1.5px] border-white/20'
                  }`}
                />

                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-stage/60 px-2.5 py-2 font-mono text-[9px]">
                  <span className={picked ? 'text-ink' : 'text-dim'}>
                    {String(index + 1).padStart(2, '0')} · {STATUS_LABEL[status]}
                  </span>
                  {item?.error && <span className="text-danger">!</span>}
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

          <DashedTile onClick={onAddShot} className="h-[148px] rounded-xl font-mono text-[10px]">
            + add
          </DashedTile>
        </div>

        <div className="flex items-center gap-2.5 rounded-[10px] border border-accent/20 bg-accent/[.06] px-3.5 py-2.5">
          <Badge tone="accent">OFFLINE</Badge>
          <span className="t-ui text-accent-ink">
            Everything renders on this machine. No file is ever uploaded.
          </span>
        </div>
      </div>

      <Panel className="w-[316px] shrink-0 space-y-5 overflow-y-auto rounded-none border-0 border-l border-white/5 p-[26px_22px]">
        <Section title="Style applied" aside={<button type="button" onClick={onChangeStyle} className="t-ui-small text-accent hover:underline">Change</button>}>
          <div className="flex items-center gap-2.5">
            <span className="h-[22px] w-[30px] rounded border border-hairline bg-sunken" />
            <span className="t-ui text-ink">{style?.name ?? 'Current settings'}</span>
          </div>
        </Section>

        <Section title="Ratio set">
          <div className="space-y-1">
            {RATIOS.map((ratio) => {
              const checked = ratios.includes(ratio)
              return (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onToggleRatio(ratio)}
                  aria-pressed={checked}
                  className={`flex w-full items-center gap-2.5 rounded-[9px] border px-2.5 py-2 transition-colors duration-140 ${
                    checked ? 'border-accent/30 bg-accent/10' : 'border-transparent hover:bg-white/[.03]'
                  }`}
                >
                  <span
                    className={`size-[15px] rounded-[4px] ${
                      checked ? 'bg-accent' : 'border-[1.5px] border-white/20'
                    }`}
                  />
                  <span className="t-ui text-ink">{ratio}</span>
                </button>
              )
            })}
          </div>
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
              { value: 'webp', label: 'webp' },
              { value: 'png', label: 'png' },
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
