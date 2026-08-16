import { LocalIcon, ScreenIcon } from './icons.tsx'
import { Badge, Segmented } from './ui.tsx'
import type { Screen } from '../types.ts'

/* Les destinations gardent leur mot : un onglet de navigation se lit, il ne se
   devine pas. L'icône n'est là que pour le repérage au coup d'œil — sauf sous
   1180 px, où le mot tombe pour que la barre ne déborde jamais. L'infobulle et
   le nom accessible, eux, ne bougent pas. */
const WORD = 'max-[1180px]:hidden'

function option(value: Screen, word: string) {
  const Icon = ScreenIcon[value]
  return {
    value,
    title: word,
    label: (
      <>
        <Icon />
        <span className={WORD}>{word}</span>
      </>
    ),
  }
}

/* Un seul groupe : quatre destinations de même rang, et l'ordre dit le reste —
   d'abord ce qui produit le document courant, ensuite ce qui vit plus longtemps
   que lui. */
const SCREENS = [
  option('edit', 'Edit'),
  option('batch', 'Batch'),
  option('styles', 'Styles'),
  option('history', 'History'),
] as const

type TopBarProps = {
  screen: Screen
  /** Masquée sur l'écran d'import : il n'y a encore nulle part où aller. */
  showNav?: boolean
  onScreen: (screen: Screen) => void
  /** Retour à l'écran d'accueil par la marque — vide la session en cours. */
  onHome: () => void
}

const WORDMARK = 'text-[15px] font-bold tracking-tight'

/**
 * Barre haute unique, 58 px : l'identité, puis la navigation, et rien d'autre.
 * Une action vit près de ce qu'elle manipule — export et copie dans le
 * filmstrip, actions de lot ou de bibliothèque dans leur écran. La barre garde
 * ainsi la même largeur partout : plus rien n'y entre ni n'en sort au fil de la
 * navigation.
 */
export default function TopBar({ screen, showNav = true, onScreen, onHome }: TopBarProps) {
  return (
    <header className="relative z-20 flex h-[58px] items-center gap-4 border-b border-white/5 px-5">
      {/* Sur l'écran d'import, la marque n'est pas un bouton : il n'y a nulle
          part où revenir, et un bouton sans effet est un mensonge. */}
      {showNav ? (
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

      {showNav && (
        <nav className="ml-[14px]">
          <Segmented options={SCREENS} value={screen} onPick={onScreen} />
        </nav>
      )}
    </header>
  )
}
