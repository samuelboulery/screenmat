import { TOOL_ICON, type LucideIcon } from './icons.tsx'
import { Panel } from './ui.tsx'

/** Les clés restent les abréviations mono d'origine — c'est l'identité d'un
 *  outil dans le code, pas ce qui s'affiche. Le rail fait 56 px : à l'écran,
 *  l'icône va seule, et le nom complet vit dans l'infobulle. */
export type ComposeTool = 'FRM' | 'BG' | '3D' | 'TXT' | 'BLUR'
export type AnnotateTool = 'SEL' | 'TXT' | 'NUM' | 'ARR' | 'LIN' | 'BOX' | 'ELL' | 'RDC'
export type Tool = ComposeTool | AnnotateTool

export const COMPOSE_TOOLS: ComposeTool[] = ['FRM', 'BG', '3D', 'TXT', 'BLUR']
export const ANNOTATE_TOOLS: AnnotateTool[] = [
  'SEL',
  'TXT',
  'NUM',
  'ARR',
  'LIN',
  'BOX',
  'ELL',
  'RDC',
]

const TITLES: Record<Tool, string> = {
  FRM: 'Frame & canvas',
  BG: 'Background',
  '3D': 'Depth & layout',
  TXT: 'Title bar',
  BLUR: 'Blur & grain',
  SEL: 'Select',
  ARR: 'Arrow',
  LIN: 'Line',
  BOX: 'Box',
  ELL: 'Ellipse',
  NUM: 'Numbered badge',
  RDC: 'Redact',
}

type ToolRailProps<T extends string> = {
  tools: readonly T[]
  active: T
  onPick: (tool: T) => void
  /** Rail horizontal sous la barre haute, en dessous de 1100 px. */
  horizontal?: boolean
}

export default function ToolRail<T extends Tool>({
  tools,
  active,
  onPick,
  horizontal = false,
}: ToolRailProps<T>) {
  return (
    <Panel
      className={
        horizontal
          ? 'absolute top-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-lg p-1.5'
          : 'absolute top-[88px] left-5 z-10 w-14 space-y-1.5 p-1.5'
      }
    >
      {tools.map((tool) => {
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
                ? 'bg-raised text-white'
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
