import { AddIcon } from './icons.tsx'
import { MAX_PALETTE_ACCENTS, withAccent, withColor, withoutAccent } from '../lib/styles.ts'
import type { Palette } from '../types.ts'

/** Index conventionnel de la couleur de base : elle se change, ne se retire pas. */
const BASE = -1

type BackgroundPaletteProps = {
  /** Celle figée dans le document si elle existe, sinon celle de la capture. */
  palette: Palette
  frozen: boolean
  /** Nouvelle palette figée, ou `undefined` pour revenir à la capture. */
  onChange: (palette: Palette | undefined) => void
}

/**
 * Les couleurs du fond, éditables teinte par teinte. La première retouche fige
 * la palette de la capture dans le document (`settings.palette`) : une palette
 * qui se recalcule à chaque capture ne s'édite pas. « Reset » la rend.
 */
export default function BackgroundPalette({ palette, frozen, onChange }: BackgroundPaletteProps) {
  const full = palette.accents.length >= MAX_PALETTE_ACCENTS

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <ColorTile color={palette.base} label="Base color" onColor={(color) => onChange(withColor(palette, BASE, color))} />
        {palette.accents.map((color, index) => (
          <ColorTile
            key={`${color}-${index}`}
            color={color}
            label={`Accent ${index + 1}`}
            onColor={(next) => onChange(withColor(palette, index, next))}
            onRemove={() => onChange(withoutAccent(palette, index))}
          />
        ))}
        {/* Ajouter reprend le sélecteur natif : aucune dépendance, focalisable
            au clavier. */}
        <label
          title={full ? `${MAX_PALETTE_ACCENTS} colors maximum` : 'Add a color'}
          className={`relative flex size-8 items-center justify-center rounded-xs border border-dashed border-ink/15 text-dim ${
            full ? 'pointer-events-none opacity-40' : 'hover:border-ink/25 hover:text-ink-soft'
          }`}
        >
          <AddIcon />
          <input
            type="color"
            aria-label="Add a color"
            disabled={full}
            // Repartir du blanc : une couleur qui n'existe pas encore n'a pas de valeur.
            value="#ffffff"
            onChange={(event) => onChange(withAccent(palette, event.target.value))}
            className="absolute inset-0 size-full opacity-0"
          />
        </label>
      </div>
      <p className="t-ui-small text-dim">
        {frozen ? (
          <button type="button" onClick={() => onChange(undefined)} className="underline underline-offset-2 hover:text-ink">
            Reset to screenshot colours
          </button>
        ) : (
          'From the screenshot — pick a colour to change it'
        )}
      </p>
    </div>
  )
}

/** Un carré de la palette : cliquer l'ouvre, le `×` le retire quand il peut. */
function ColorTile({
  color,
  label,
  onColor,
  onRemove,
}: {
  color: string
  label: string
  onColor: (color: string) => void
  onRemove?: () => void
}) {
  return (
    <span className="group relative inline-flex">
      <label
        title={`${label} — ${color}`}
        style={{ background: color }}
        className="relative flex size-8 items-center justify-center rounded-xs border border-ink/10"
      >
        <input
          type="color"
          aria-label={label}
          value={color}
          onChange={(event) => onColor(event.target.value)}
          className="absolute inset-0 size-full opacity-0"
        />
      </label>
      {onRemove && (
        // Visible au survol comme au focus : un contrôle qui n'apparaît qu'à la
        // souris n'existe pas au clavier.
        <button
          type="button"
          title={`Remove ${label.toLowerCase()}`}
          aria-label={`Remove ${label.toLowerCase()}`}
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full border border-hairline bg-stage text-[10px] text-ink-soft opacity-0 transition-opacity duration-140 group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
        >
          ×
        </button>
      )}
    </span>
  )
}
