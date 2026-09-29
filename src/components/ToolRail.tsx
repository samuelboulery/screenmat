import { TOOL_ICON, type LucideIcon } from './icons.tsx'
import Tooltip from './Tooltip.tsx'
import { TOOLS, TOOL_KEYS, TOOL_TITLES, type Tool } from '../lib/tools.ts'
import { Panel, SWITCH_ON } from './ui.tsx'

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
        const held = locked && active === tool
        return (
          <Tooltip
            key={tool}
            label={held ? `${TOOL_TITLES[tool]} · locked` : TOOL_TITLES[tool]}
            shortcut={TOOL_KEYS[tool]}
          >
            <button
              type="button"
              aria-label={held ? `${TOOL_TITLES[tool]}, locked` : TOOL_TITLES[tool]}
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
          </Tooltip>
        )
      })}
    </Panel>
  )
}
