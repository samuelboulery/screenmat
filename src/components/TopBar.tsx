import type { ReactNode } from 'react'
import { LocalIcon, ModeIcon, ViewIcon } from './icons.tsx'
import { Badge, Segmented } from './ui.tsx'

export type Mode = 'compose' | 'annotate' | 'batch'
export type View = 'editor' | 'styles' | 'history'

/* Modes et vues gardent leur mot : un onglet de navigation se lit, il ne se
   devine pas. L'icône n'est là que pour le repérage au coup d'œil — sauf sous
   1180 px, où le mot tombe pour que la barre ne déborde jamais. L'infobulle et
   le nom accessible, eux, ne bougent pas. */
const WORD = 'max-[1180px]:hidden'

const MODES = [
  {
    value: 'compose',
    title: 'Compose',
    label: (
      <>
        <ModeIcon.compose />
        <span className={WORD}>Compose</span>
      </>
    ),
  },
  {
    value: 'annotate',
    title: 'Annotate',
    label: (
      <>
        <ModeIcon.annotate />
        <span className={WORD}>Annotate</span>
      </>
    ),
  },
  {
    value: 'batch',
    title: 'Batch',
    label: (
      <>
        <ModeIcon.batch />
        <span className={WORD}>Batch</span>
      </>
    ),
  },
] as const

const VIEWS = [
  { value: 'editor', label: 'Editor', Icon: ViewIcon.editor },
  { value: 'styles', label: 'Styles', Icon: ViewIcon.styles },
  { value: 'history', label: 'History', Icon: ViewIcon.history },
] as const

type TopBarProps = {
  view: View
  mode: Mode
  /** Masqué sur l'écran d'import : il n'y a encore rien à composer. */
  showModes?: boolean
  onView: (view: View) => void
  onMode: (mode: Mode) => void
  /** Retour à l'écran d'accueil par la marque — vide la session en cours. */
  onHome: () => void
  children?: ReactNode
}

const WORDMARK = 'text-[15px] font-bold tracking-tight'

/**
 * Barre haute unique, 58 px. À gauche les modes d'édition (groupe segmenté), à
 * droite les vues de gestion (liens texte) puis les actions de l'écran courant.
 * Ce qui décrit ou manipule le *document* — dimensions, undo/redo, nouvelle
 * session — vit dans le filmstrip, pas ici.
 */
export default function TopBar({
  view,
  mode,
  showModes = true,
  onView,
  onMode,
  onHome,
  children,
}: TopBarProps) {
  return (
    <header className="relative z-20 flex h-[58px] items-center gap-4 border-b border-white/5 px-5">
      {/* Sur l'écran d'import, la marque n'est pas un bouton : il n'y a nulle
          part où revenir, et un bouton sans effet est un mensonge. */}
      {showModes ? (
        <button
          type="button"
          onClick={onHome}
          title="Back to start"
          aria-label="Back to start"
          className={`${WORDMARK} transition-colors duration-140 hover:text-accent-ink`}
        >
          shotframe
        </button>
      ) : (
        <span className={WORDMARK}>shotframe</span>
      )}
      <Badge>
        <span className="flex items-center gap-1">
          <LocalIcon className="size-3" /> LOCAL
        </span>
      </Badge>

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
        <nav className="flex items-center gap-3.5">
          {VIEWS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onView(item.value)}
              title={item.label}
              aria-label={item.label}
              aria-current={view === item.value}
              className={`t-ui flex items-center gap-1.5 pb-[3px] transition-colors duration-140 ${
                view === item.value
                  ? 'border-b-[1.5px] border-accent text-ink'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <item.Icon />
              <span className={WORD}>{item.label}</span>
            </button>
          ))}
        </nav>
        {children}
      </div>
    </header>
  )
}
