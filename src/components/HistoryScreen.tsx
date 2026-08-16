import { useMemo, useState } from 'react'
import { NewShotIcon, SearchIcon, SortNewestIcon, SortOldestIcon } from './icons.tsx'
import { Button, DashedTile, Segmented } from './ui.tsx'
import { humanSize } from '../lib/export.ts'
import { QUOTA_WARNING_BYTES, type HistoryMeta } from '../lib/store.ts'
import type { Style } from '../types.ts'

type Sort = 'newest' | 'oldest'

type HistoryScreenProps = {
  entries: readonly HistoryMeta[]
  styles: readonly Style[]
  bytes: number
  onOpen: (id: string) => void
  onAdd: () => void
  onPurge: () => void
  /** Sous 1100 px : la grille passe à deux colonnes. */
  narrow?: boolean
}

/** Retrouver un export passé et le réouvrir avec ses réglages. */
export default function HistoryScreen({
  entries,
  styles,
  bytes,
  onOpen,
  onAdd,
  onPurge,
  narrow = false,
}: HistoryScreenProps) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('newest')

  const filters = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...styles.slice(0, 2).map((style) => ({ value: style.id, label: style.name })),
    ],
    [styles],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const kept = entries.filter(
      (entry) =>
        (filter === 'all' || entry.styleId === filter) &&
        (needle === '' || entry.name.toLowerCase().includes(needle)),
    )
    return sort === 'newest' ? kept : [...kept].reverse()
  }, [entries, filter, query, sort])

  return (
    <div className="stage-glow absolute inset-x-0 top-[58px] bottom-0 flex flex-col gap-4 overflow-y-auto p-7">
      <div className="flex items-center gap-4">
        <Segmented options={filters} value={filter} onPick={setFilter} />
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-dim" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exports"
              aria-label="Search exports"
              className="w-[220px] rounded-md border border-hairline bg-sunken py-2 pr-3 pl-9 text-[12px] text-ink placeholder:text-dim"
            />
          </div>
          {/* Le libellé dit ce qu'on regarde, pas un mot qui pourrait aussi se
              lire comme l'action : « newest » seul laissait deviner si un clic
              décrivait l'ordre courant ou le changeait. */}
          <button
            type="button"
            onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] text-dim uppercase hover:text-ink"
          >
            {sort === 'newest' ? <SortNewestIcon /> : <SortOldestIcon />}
            {sort === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="t-card-title">No exports yet</p>
          <p className="t-body max-w-[46ch] text-ink-soft">
            Every image you export lands here with the settings that made it. Reopen one to
            pick up where you left off.
          </p>
          <Button variant="primary" onClick={onAdd}>
            <NewShotIcon />
            Add a screenshot
          </Button>
        </div>
      ) : (
      <div className={`grid auto-rows-[208px] gap-4 ${narrow ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {visible.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onOpen(entry.id)}
            title={entry.name}
            className="relative overflow-hidden rounded-lg border border-hairline bg-sunken"
          >
            <img src={entry.thumbnail} alt="" className="size-full object-cover" />
            {/* Voile de lisibilité : la métadonnée est blanche, les screenshots
                clairs la rendraient illisible sans ça. */}
            <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-stage/85 to-transparent" />
            <span className="t-mono-micro absolute right-3 bottom-2.5 left-3 flex justify-between text-white/75">
              <span className="truncate">{entry.name}</span>
              <span>
                {entry.ratio} · {entry.scale}×
              </span>
            </span>
          </button>
        ))}

        <DashedTile onClick={onAdd} className="flex-col gap-1.5 rounded-lg font-mono text-[10px]">
          <NewShotIcon />
          ⌘V to add
        </DashedTile>
      </div>
      )}

      {entries.length > 0 && visible.length === 0 && (
        <p className="t-body text-ink-soft">
          No exports match “{query}”.{' '}
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setFilter('all')
            }}
            className="text-accent hover:underline"
          >
            Clear the search
          </button>
        </p>
      )}

      {entries.length > 0 && (
        <p className="t-ui text-dim">
          {visible.length} of {entries.length} exports · {humanSize(bytes)} stored in this browser.
          Clearing site data deletes them — there is no copy anywhere else.
          {bytes > QUOTA_WARNING_BYTES && (
            <>
              {' '}
              {/* La confirmation est posée par `App` : un seul dialogue monté
                  pour toute l'app. */}
              <button type="button" onClick={onPurge} className="text-danger hover:underline">
                Delete the oldest exports
              </button>{' '}
              to get back under {humanSize(QUOTA_WARNING_BYTES)}.
            </>
          )}
        </p>
      )}
    </div>
  )
}
