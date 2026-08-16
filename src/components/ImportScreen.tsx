import { Button, ErrorNote, MonoLabel } from './ui.tsx'
import type { HistoryMeta } from '../lib/store.ts'

type ImportScreenProps = {
  dragging: boolean
  error: string | null
  hasLastStyle: boolean
  recents: readonly HistoryMeta[]
  onPick: () => void
  onUseLastStyle: () => void
  onOpenRecent: (id: string) => void
}

/** Quatre emplacements : les vides restent dessinés tant que rien ne les remplit. */
const RECENT_SLOTS = 4

/** Premier écran, aucune image chargée. Une seule action évidente. */
export default function ImportScreen({
  dragging,
  error,
  hasLastStyle,
  recents,
  onPick,
  onUseLastStyle,
  onOpenRecent,
}: ImportScreenProps) {
  const slots = Array.from({ length: RECENT_SLOTS }, (_, index) => recents[index] ?? null)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-11 px-5">
      <div
        className={`flex h-[372px] w-[720px] max-w-full flex-col items-center justify-center gap-[22px] rounded-[20px] border border-dashed transition-colors duration-140 ${
          dragging ? 'border-accent/45 bg-accent/5' : 'border-white/[.16] bg-white/[.02]'
        }`}
      >
        <span className="rounded-xl border border-accent/30 bg-accent/[.08] px-[18px] py-3 font-mono text-[15px] text-accent-ink">
          ⌘ V
        </span>
        <h1 className="t-display">Paste a screenshot</h1>
        <p className="text-[14px] text-ink-soft">
          or drop a file here — nothing leaves your browser
        </p>
        <div className="flex items-center gap-2.5">
          <Button variant="primary" onClick={onPick}>
            Choose file
          </Button>
          <Button onClick={onUseLastStyle} disabled={!hasLastStyle}>
            Start from last style
          </Button>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>

      <div className="w-[720px] max-w-full space-y-3">
        <MonoLabel>Recent — this browser</MonoLabel>
        <div className="grid grid-cols-4 gap-4">
          {slots.map((entry, index) =>
            entry ? (
              <button
                key={entry.id}
                type="button"
                onClick={() => onOpenRecent(entry.id)}
                title={entry.name}
                className="relative h-[106px] overflow-hidden rounded-[10px] border border-hairline bg-sunken"
              >
                <img src={entry.thumbnail} alt="" className="size-full object-cover" />
                {/* Voile de lisibilité : sans lui, la métadonnée blanche
                    disparaît sur un screenshot clair. */}
                <span className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-stage/85 to-transparent" />
                <span className="t-mono-micro absolute right-2 bottom-1.5 left-2 flex justify-between text-white/75">
                  <span className="truncate">{entry.name}</span>
                  <span>{entry.ratio}</span>
                </span>
              </button>
            ) : (
              <div
                key={`empty-${index}`}
                className="h-[106px] rounded-[10px] border border-hairline bg-white/[.03]"
              />
            ),
          )}
        </div>
      </div>
    </div>
  )
}
