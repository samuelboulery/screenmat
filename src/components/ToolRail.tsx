import { TOOL_ICON, type LucideIcon } from './icons.tsx'
import { Panel, SWITCH_ON } from './ui.tsx'

/** Les clés restent les abréviations mono d'origine — c'est l'identité d'un
 *  outil dans le code, pas ce qui s'affiche. Le rail fait 56 px : à l'écran,
 *  l'icône va seule, et le nom complet vit dans l'infobulle.
 *
 *  Le rail ne porte que des **instruments** : ce qui laisse une trace sur le
 *  screenshot. Les réglages du document — cadre, fond, profondeur — vivent dans
 *  l'inspecteur, où ils n'usurpent plus la place d'un outil. */
export type Tool = 'SEL' | 'TXT' | 'NUM' | 'ARR' | 'LIN' | 'BOX' | 'ELL' | 'RDC'

export const TOOLS: Tool[] = ['SEL', 'TXT', 'NUM', 'ARR', 'LIN', 'BOX', 'ELL', 'RDC']

const TITLES: Record<Tool, string> = {
  SEL: 'Select',
  TXT: 'Text label',
  ARR: 'Arrow',
  LIN: 'Line',
  BOX: 'Box',
  ELL: 'Ellipse',
  NUM: 'Numbered badge',
  RDC: 'Redact',
}

type ToolRailProps = {
  active: Tool
  onPick: (tool: Tool) => void
  /** Rail horizontal sous la barre haute, en dessous de 1100 px. */
  horizontal?: boolean
}

export default function ToolRail({ active, onPick, horizontal = false }: ToolRailProps) {
  return (
    <Panel
      className={
        horizontal
          ? 'absolute top-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-lg p-1.5'
          : 'absolute top-[88px] left-5 z-10 w-14 space-y-1.5 p-1.5'
      }
    >
      {TOOLS.map((tool) => {
        const Icon: LucideIcon = TOOL_ICON[tool]
        return (
          <button
            key={tool}
            type="button"
            title={TITLES[tool]}
            aria-label={TITLES[tool]}
            aria-pressed={active === tool}
            onClick={() => onPick(tool)}
            className={`flex size-11 items-center justify-center rounded-md transition-colors duration-140 ${
              active === tool
                ? SWITCH_ON
                : tool === 'RDC'
                  ? 'text-danger hover:bg-white/[.04]'
                  : 'text-ink-soft hover:bg-white/[.04] hover:text-ink'
            }`}
          >
            <Icon className="size-5" />
          </button>
        )
      })}
    </Panel>
  )
}
