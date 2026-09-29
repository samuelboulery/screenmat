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

/** Touche nue de chaque outil — celles de Figma là où elles existent. `R`
 *  prend la Box, le fond se régénère donc à `⇧R`. */
export const TOOL_KEYS: Record<Tool, string> = {
  SEL: 'V',
  TXT: 'T',
  NUM: 'N',
  ARR: 'A',
  LIN: 'L',
  BOX: 'R',
  ELL: 'O',
  RDC: 'B',
}

/** L'outil d'une touche nue, en minuscule ou non. */
export function toolForKey(key: string): Tool | null {
  const upper = key.toUpperCase()
  return TOOLS.find((tool) => TOOL_KEYS[tool] === upper) ?? null
}

export const TOOL_TITLES: Record<Tool, string> = {
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
  /** L'outil reste en main après usage : double-clic sur le rail. */
  locked: boolean
  onPick: (tool: Tool) => void
  onLock: (tool: Tool) => void
}

/** La barre d'outils, flottante en haut du canvas. L'éditeur la centre sur la
 *  zone de dessin ; elle ne se positionne pas elle-même. */
export default function ToolRail({ active, locked, onPick, onLock }: ToolRailProps) {
  return (
    <Panel className="pointer-events-auto flex gap-1 rounded-lg p-1.5">
      {TOOLS.map((tool) => {
        const Icon: LucideIcon = TOOL_ICON[tool]
        const title = `${TOOL_TITLES[tool]} · ${TOOL_KEYS[tool]}`
        const held = locked && active === tool
        return (
          <button
            key={tool}
            type="button"
            title={held ? `${title} (locked — click to release)` : `${title} — double-click to lock`}
            aria-label={held ? `${TOOL_TITLES[tool]}, locked` : TOOL_TITLES[tool]}
            aria-keyshortcuts={TOOL_KEYS[tool]}
            aria-pressed={active === tool}
            onClick={() => onPick(tool)}
            onDoubleClick={() => onLock(tool)}
            className={`relative flex size-11 items-center justify-center rounded-md transition-colors duration-140 ${
              active === tool
                ? SWITCH_ON
                : tool === 'RDC'
                  ? 'text-danger hover:bg-ink/[.04]'
                  : 'text-ink-soft hover:bg-ink/[.04] hover:text-ink'
            }`}
          >
            <Icon className="size-5" />
            {/* Verrou : un point d'encre au coin, comme la pastille de Figma. */}
            {held && <span aria-hidden className="absolute right-1 bottom-1 size-1 rounded-full bg-ink" />}
          </button>
        )
      })}
    </Panel>
  )
}
