import { useEffect, useMemo, useRef, useState } from 'react'
import { CancelIcon, SearchIcon, SortNewestIcon, SortOldestIcon } from './icons.tsx'
import { IconButton } from './ui.tsx'
import { humanSize } from '../lib/export.ts'
import { QUOTA_WARNING_BYTES, type HistoryMeta } from '../lib/store.ts'
import type { Style } from '../types.ts'

type Sort = 'newest' | 'oldest'

type HistoryDrawerProps = {
  open: boolean
  onClose: () => void
  entries: readonly HistoryMeta[]
  styles: readonly Style[]
  bytes: number
  onOpen: (id: string) => void
  onPurge: () => void
}

/**
 * Retrouver un export passé et le réouvrir avec ses réglages. Un tiroir, pas
 * un écran : on y passe pour reprendre un travail, puis on revient à l'image.
 * Sur l'élément natif `<dialog>` — focus piégé puis rendu, `Esc`, reste de la
 * page inerte — comme la confirmation.
 */
export default function HistoryDrawer({
  open,
  onClose,
  entries,
  styles,
  bytes,
  onOpen,
  onPurge,
}: HistoryDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('newest')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

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
    <dialog
      ref={ref}
      onClose={onClose}
      // Clic sur le fond : la cible est le `<dialog>` lui-même, le contenu le
      // remplit entièrement.
      onClick={(event) => event.target === event.currentTarget && onClose()}
      aria-label="History"
      className="panel fixed inset-y-0 right-0 left-auto m-0 bg-panel-solid h-full max-h-none w-[min(640px,100vw)] max-w-none rounded-none border-y-0 border-r-0 p-0 text-ink backdrop:bg-stage/60"
    >
      {/* Fermé, rien de monté : aucune miniature chargée pour rien. */}
      {open && (
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
        <div className="flex items-center gap-3">
          <h2 className="t-mono-label">History — {entries.length}</h2>
          <IconButton icon={CancelIcon} label="Close history" onClick={onClose} className="ml-auto" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Tous les styles, pas les deux premiers : un filtre qui en cache
              n'est pas un filtre. */}
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter by style"
            className="rounded-md border border-hairline bg-sunken px-3 py-2 text-[12px] text-ink"
          >
            <option value="all">All styles</option>
            {styles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.name}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-dim" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search exports"
                aria-label="Search exports"
                className="w-[200px] rounded-md border border-hairline bg-sunken py-2 pr-3 pl-9 text-[12px] text-ink placeholder:text-dim"
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
          </div>
        ) : (
        <div className="grid auto-rows-[180px] grid-cols-2 gap-4">
          {visible.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                onOpen(entry.id)
                onClose()
              }}
              title={entry.name}
              className="relative overflow-hidden rounded-lg border border-hairline bg-sunken"
            >
              <img src={entry.thumbnail} alt="" className="size-full object-cover" />
              {/* Voile de lisibilité : la métadonnée est blanche, les screenshots
                  clairs la rendraient illisible sans ça. */}
              <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-stage/85 to-transparent" />
              <span className="t-mono-micro absolute right-3 bottom-2.5 left-3 flex justify-between text-ink/75">
                <span className="truncate">{entry.name}</span>
                <span>
                  {entry.ratio} · {entry.scale}×
                </span>
              </span>
            </button>
          ))}
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
      )}
    </dialog>
  )
}
