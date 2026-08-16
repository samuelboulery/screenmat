import type { ReactNode } from 'react'
import { Badge, Segmented } from './ui.tsx'

export type Mode = 'compose' | 'annotate' | 'batch'
export type View = 'editor' | 'styles' | 'history'

const MODES = [
  { value: 'compose', label: 'Compose' },
  { value: 'annotate', label: 'Annotate' },
  { value: 'batch', label: 'Batch' },
] as const

const VIEWS = [
  { value: 'editor', label: 'Editor' },
  { value: 'styles', label: 'Styles' },
  { value: 'history', label: 'History' },
] as const

type TopBarProps = {
  view: View
  mode: Mode
  /** Masqué sur l'écran d'import : il n'y a encore rien à composer. */
  showModes?: boolean
  onView: (view: View) => void
  onMode: (mode: Mode) => void
  children?: ReactNode
}

/**
 * Barre haute unique, 58 px. À gauche les modes d'édition (groupe segmenté), à
 * droite les vues de gestion (liens texte) puis les actions de l'écran courant.
 */
export default function TopBar({
  view,
  mode,
  showModes = true,
  onView,
  onMode,
  children,
}: TopBarProps) {
  return (
    <header className="relative z-20 flex h-[58px] items-center gap-4 border-b border-white/5 px-5">
      <span className="text-[15px] font-bold tracking-tight">shotframe</span>
      <Badge>LOCAL</Badge>

      {showModes && (
        <Segmented
          className="ml-[14px]"
          options={MODES}
          value={mode}
          onPick={(next) => {
            onView('editor')
            onMode(next)
          }}
        />
      )}

      <div className="ml-auto flex items-center gap-4">
        <nav className="flex items-center gap-[14px]">
          {VIEWS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onView(item.value)}
              aria-current={view === item.value}
              className={`t-ui pb-[3px] transition-colors duration-140 ${
                view === item.value
                  ? 'border-b-[1.5px] border-accent text-ink'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {children}
      </div>
    </header>
  )
}
