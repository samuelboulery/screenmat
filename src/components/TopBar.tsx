import type { ReactNode } from 'react'
import { DevDocsIcon, LocalIcon, ShortcutsIcon, ThemeIcon } from './icons.tsx'
import { useLang } from '../hooks/useLang.ts'
import { useTheme } from '../hooks/useTheme.ts'
import { m } from '../lib/i18n/index.ts'
import { Badge, ExternalLink, IconButton } from './ui.tsx'

/* Le mot tombe sous 1180 px, pour que la barre ne déborde jamais. L'infobulle
   et le nom accessible, eux, ne bougent pas. */
const WORD = 'max-[1180px]:hidden'

type TopBarProps = {
  /** Styles, History et Export — absents tant qu'aucune image n'est ouverte. */
  actions?: ReactNode
  /** Le panneau des raccourcis — le même que la touche `?`. */
  onHelp: () => void
}

/**
 * Barre haute unique, 58 px : l'identité à gauche ; à droite, la bibliothèque
 * (Styles, History), l'export, la porte machine, la langue et le thème. Il n'y a plus
 * d'écrans entre lesquels naviguer : l'espace de travail est unique.
 */
export default function TopBar({ actions, onHelp }: TopBarProps) {
  return (
    <header className="relative z-20 flex h-[58px] items-center gap-4 border-b border-ink/5 px-5">
      <span className="text-[15px] font-bold tracking-tight">screenmat</span>
      <Badge>
        <span className="flex items-center gap-1">
          <LocalIcon className="size-3" /> {m.core.topBar.local}
        </span>
      </Badge>

      <div className="ml-auto flex items-center gap-2">
        {actions}
        {/* La porte machine, présente aussi sur l'écran d'import — c'est là
            qu'on cherche par quoi commencer. Une page servie à côté de l'app,
            donc hors ligne comme elle. */}
        <ExternalLink
          href="/docs/"
          title={m.core.topBar.docsTitle}
          aria-label={m.core.topBar.docs}
        >
          <DevDocsIcon />
          <span className={WORD}>{m.core.topBar.docs}</span>
        </ExternalLink>
        <IconButton icon={ShortcutsIcon} label={m.core.topBar.shortcuts} shortcut="?" onClick={onHelp} />
        <LangToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}

/** Clair ou sombre, pour le chrome seulement : l'export ne change pas. */
function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const Icon = ThemeIcon[theme]
  const label = theme === 'dark' ? m.core.topBar.toLight : m.core.topBar.toDark
  return <IconButton icon={Icon} label={label} onClick={toggle} />
}

/** La langue courante, écrite : une langue se lit, elle ne se dessine pas. Le
 *  nom accessible est dans la langue d'arrivée, et le dit (`lang`). */
function LangToggle() {
  const { lang, toggle } = useLang()
  const label = m.core.topBar.switchLang
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      lang={lang === 'fr' ? 'en' : 'fr'}
      onClick={toggle}
      className="flex size-8 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-medium text-ink-soft transition-colors duration-140 hover:bg-ink/[.04] hover:text-ink"
    >
      {lang.toUpperCase()}
    </button>
  )
}
