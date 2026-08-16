import { AddIcon } from './icons.tsx'
import { MonoLabel, Section, Toggle } from './ui.tsx'
import { MAX_PALETTE_ACCENTS } from '../lib/styles.ts'
import type { Palette } from '../types.ts'

/** Index conventionnel de la couleur de base : elle se change, ne se retire pas. */
const BASE = -1

/**
 * La palette figée d'un style. Éditer une couleur d'une palette encore
 * échantillonnée la fige — une palette qui se recalcule à chaque screenshot ne
 * peut pas s'éditer, et le toggle ne fait que refléter cette présence.
 */
export default function StylePalette({
  palette,
  frozen,
  onOverride,
  onColor,
  onAdd,
  onRemove,
}: {
  /** Celle du style si elle est figée, sinon celle échantillonnée du shot. */
  palette: Palette | null
  frozen: boolean
  onOverride: (override: boolean) => void
  onColor: (index: number, color: string) => void
  onAdd: (color: string) => void
  onRemove: (index: number) => void
}) {
  const full = (palette?.accents.length ?? 0) >= MAX_PALETTE_ACCENTS

  return (
    <Section
      title="Palette"
      aside={
        <span className="flex items-center gap-2.5">
          <span className="t-ui-small text-ink-soft">Override sampled colors</span>
          <Toggle
            checked={frozen}
            onChange={onOverride}
            label="Override sampled colors"
            disabled={!palette}
            title={!palette ? 'Load a shot to sample colors first' : undefined}
          />
        </span>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {palette && (
          <ColorTile
            color={palette.base}
            label="Base color"
            onColor={(color) => onColor(BASE, color)}
          />
        )}
        {palette?.accents.map((color, index) => (
          <ColorTile
            key={`${color}-${index}`}
            color={color}
            label={`Accent ${index + 1}`}
            onColor={(next) => onColor(index, next)}
            onRemove={() => onRemove(index)}
          />
        ))}

        {/* Ajouter reprend le même input que l'édition : c'est le sélecteur
            natif, aucune dépendance, et il reste focalisable au clavier. */}
        <label
          title={
            !palette
              ? 'Load a shot to sample colors first'
              : full
                ? `${MAX_PALETTE_ACCENTS} colors maximum`
                : 'Add a color'
          }
          className={`relative flex h-10 w-[54px] items-center justify-center rounded-md border border-dashed border-white/15 text-dim ${
            palette && !full
              ? 'hover:border-white/25 hover:text-ink-soft'
              : 'pointer-events-none opacity-40'
          }`}
        >
          <AddIcon />
          {/* L'input garde la taille du carré : réduit à 0×0 il resterait
              focalisable, l'anneau de focus n'entourant plus rien. */}
          <input
            type="color"
            aria-label="Add a color"
            disabled={!palette || full}
            // Repartir du blanc à chaque ouverture : la valeur courante n'a pas
            // de sens pour une couleur qui n'existe pas encore.
            value="#ffffff"
            onChange={(event) => onAdd(event.target.value)}
            className="absolute inset-0 size-full rounded-md opacity-0"
          />
        </label>
      </div>

      {!frozen && palette && (
        <MonoLabel className="text-dim">
          Sampled from the shot — editing a color freezes the palette in this style
        </MonoLabel>
      )}
    </Section>
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
        className="relative flex h-10 w-[54px] items-center justify-center rounded-md border border-white/10"
      >
        <input
          type="color"
          aria-label={label}
          value={color}
          onChange={(event) => onColor(event.target.value)}
          className="absolute inset-0 size-full rounded-md opacity-0"
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
