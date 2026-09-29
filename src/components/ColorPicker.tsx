import { Swatch } from './ui.tsx'

type ColorPickerProps = {
  colors: readonly string[]
  value: string
  onPick: (color: string) => void
  /** Nom accessible du sélecteur libre — « Text color », « Plate color »… */
  label: string
}

/** Nuancier et couleur libre. Partagé par la couleur d'un calque et la plaque
 *  d'un texte : un seul geste pour choisir une couleur, partout. */
export default function ColorPicker({ colors, value, onPick, label }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((color) => (
        <Swatch
          key={color}
          color={color}
          active={value.toUpperCase() === color.toUpperCase()}
          onClick={() => onPick(color)}
        />
      ))}
      {/* L'input garde sa taille : réduit à 0×0 il restait focalisable, et
          l'anneau de focus n'avait plus rien à entourer. Ici il couvre tout
          le carré, invisible mais focalisable là où on le voit. */}
      <label
        title={label}
        className="relative flex size-10 items-center justify-center rounded-lg border border-dashed border-ink/20 text-[10px] text-dim hover:border-ink/35"
      >
        <span aria-hidden>···</span>
        <input
          type="color"
          value={value}
          aria-label={label}
          onChange={(event) => onPick(event.target.value)}
          className="absolute inset-0 size-full rounded-lg opacity-0"
        />
      </label>
    </div>
  )
}
