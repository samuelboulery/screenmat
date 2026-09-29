import type { ReactNode } from 'react'
import { DevDocsIcon, LocalIcon, ThemeIcon } from './icons.tsx'
import { useTheme } from '../hooks/useTheme.ts'
import { Badge, ExternalLink, IconButton } from './ui.tsx'

/* Le mot tombe sous 1180 px, pour que la barre ne déborde jamais. L'infobulle
   et le nom accessible, eux, ne bougent pas. */
const WORD = 'max-[1180px]:hidden'

type TopBarProps = {
  /** Styles, History et Export — absents tant qu'aucune image n'est ouverte. */
  actions?: ReactNode
}

/**
 * Barre haute unique, 58 px : l'identité à gauche ; à droite, la bibliothèque
 * (Styles, History), l'export, la porte machine et le thème. Il n'y a plus
 * d'écrans entre lesquels naviguer : l'espace de travail est unique.
 */
export default function TopBar({ actions }: TopBarProps) {
  return (
    <header className="relative z-20 flex h-[58px] items-center gap-4 border-b border-ink/5 px-5">
      <span className="text-[15px] font-bold tracking-tight">screenmat</span>
      <Badge>
        <span className="flex items-center gap-1">
          <LocalIcon className="size-3" /> LOCAL
        </span>
      </Badge>

      <div className="ml-auto flex items-center gap-2">
        {actions}
        {/* La porte machine, présente aussi sur l'écran d'import — c'est là
            qu'on cherche par quoi commencer. Une page servie à côté de l'app,
            donc hors ligne comme elle. */}
        <ExternalLink
          href="/docs/"
          title="Dev docs — drive screenmat from a script, a CLI or an agent (Node API, CLI, MCP)"
          aria-label="Dev docs"
        >
          <DevDocsIcon />
          <span className={WORD}>Dev docs</span>
        </ExternalLink>
        <ThemeToggle />
      </div>
    </header>
  )
}

/** Clair ou sombre, pour le chrome seulement : l'export ne change pas. */
function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const Icon = ThemeIcon[theme]
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  return <IconButton icon={Icon} label={label} onClick={toggle} />
}
