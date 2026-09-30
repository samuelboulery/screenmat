import { TOOL_ICON, type LucideIcon } from './icons.tsx'
import Tooltip from './Tooltip.tsx'
import { TOOLS, TOOL_KEYS, toolTitle, type Tool } from '../lib/tools.ts'
import { Panel, SWITCH_ON } from './ui.tsx'

type ToolRailProps = {
  active: Tool
  onPick: (tool: Tool) => void
}

/** La barre d'outils, flottante en haut du canvas. L'éditeur la centre sur la
 *  zone de dessin ; elle ne se positionne pas elle-même. */
export default function ToolRail({ active, onPick }: ToolRailProps) {
  return (
    <Panel className="pointer-events-auto flex gap-1 rounded-lg p-1.5">
      {TOOLS.map((tool) => {
        const Icon: LucideIcon = TOOL_ICON[tool]
        return (
          <Tooltip key={tool} label={toolTitle(tool)} shortcut={TOOL_KEYS[tool]}>
            <button
              type="button"
              aria-label={toolTitle(tool)}
              aria-pressed={active === tool}
              onClick={() => onPick(tool)}
              className={`flex size-11 items-center justify-center rounded-md transition-colors duration-140 ${
                active === tool
                  ? SWITCH_ON
                  : tool === 'RDC'
                    ? 'text-danger hover:bg-ink/[.04]'
                    : 'text-ink-soft hover:bg-ink/[.04] hover:text-ink'
              }`}
            >
              <Icon className="size-5" />
            </button>
          </Tooltip>
        )
      })}
    </Panel>
  )
}
