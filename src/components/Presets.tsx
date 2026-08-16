import { AddIcon, SaveStyleIcon } from './icons.tsx'
import { DashedTile, Section, Tile } from './ui.tsx'
import type { Style } from '../types.ts'

/** Les styles enregistrés, applicables en un clic depuis l'éditeur. */
export default function Presets({
  styles,
  activeStyleId,
  onApplyStyle,
  onSaveStyle,
  onUpdateStyle,
}: {
  styles: readonly Style[]
  activeStyleId: string | null
  onApplyStyle: (id: string) => void
  onSaveStyle: () => void
  onUpdateStyle: () => void
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
            className="size-10 font-mono text-[10px]"
          >
            {style.name.slice(0, 2).toUpperCase()}
          </Tile>
        ))}
        {/* Écraser le style actif et en créer un nouveau sont deux gestes, pas
            un seul avec une nuance : le second bouton n'apparaît que là où il
            a un sens. */}
        {activeStyleId && (
          <Tile
            onClick={onUpdateStyle}
            title="Update the active style with the current settings"
            aria-label="Update the active style with the current settings"
            className="size-10"
          >
            <SaveStyleIcon />
          </Tile>
        )}
        <DashedTile
          onClick={onSaveStyle}
          className="size-10"
          title="Save current settings as a new style"
          aria-label="Save current settings as a new style"
        >
          <AddIcon />
        </DashedTile>
      </div>
    </Section>
  )
}
