import { DashedTile, Section, Tile } from './ui.tsx'
import type { Style } from '../types.ts'

/** Les styles enregistrés, applicables en un clic depuis l'éditeur. */
export default function Presets({
  styles,
  activeStyleId,
  onApplyStyle,
  onSaveStyle,
}: {
  styles: readonly Style[]
  activeStyleId: string | null
  onApplyStyle: (id: string) => void
  onSaveStyle: () => void
}) {
  return (
    <Section title="Presets">
      <div className="flex flex-wrap gap-1.5">
        {styles.slice(0, 5).map((style) => (
          <Tile
            key={style.id}
            active={style.id === activeStyleId}
            onClick={() => onApplyStyle(style.id)}
            title={style.name}
            className="size-[38px] rounded-[9px] text-[9px]"
          >
            {style.name.slice(0, 2).toUpperCase()}
          </Tile>
        ))}
        <DashedTile onClick={onSaveStyle} className="size-[38px] rounded-[9px]" title="Save current settings as a style">
          +
        </DashedTile>
      </div>
    </Section>
  )
}
