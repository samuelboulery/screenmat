import { useState } from 'react'
import { Swatch } from './ui.tsx'
import { m } from '../lib/i18n/index.ts'
import { HEX } from '../lib/parse.ts'

type ColorPickerProps = {
  colors: readonly string[]
  value: string
  onPick: (color: string) => void
  /** Nom accessible du sélecteur — « Text color », « Fill color »… */
  label: string
  /** Opacité de la couleur, 0 → 1. Fournie avec `onAlpha`, elle ajoute le champ `%`. */
  alpha?: number
  onAlpha?: (alpha: number) => void
}

const FIELD = 't-mono-micro h-7 rounded-xs border border-hairline bg-sunken px-2 text-ink'

/**
 * La couleur courante — pastille, hex, opacité quand elle se règle — puis le
 * nuancier. Partagé par tout ce qui a une couleur dans l'inspecteur : un seul
 * geste pour en choisir une, partout.
 */
export default function ColorPicker({ colors, value, onPick, label, alpha, onAlpha }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {/* L'input couvre la pastille, invisible mais focalisable là où on la voit. */}
        <label
          title={label}
          style={{ background: value }}
          // L'input est invisible : c'est la pastille qui montre son focus.
          className="relative size-7 shrink-0 rounded-xs border border-ink/15 has-focus-visible:ring-selected"
        >
          <input
            type="color"
            value={value}
            aria-label={label}
            onChange={(event) => onPick(event.target.value)}
            className="absolute inset-0 size-full opacity-0"
          />
        </label>
        <HexField value={value} label={m.inspector.color.hex(label)} onPick={onPick} />
        {alpha !== undefined && onAlpha && <PercentField value={alpha} label={m.inspector.color.opacity(label)} onInput={onAlpha} />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((color) => (
          <Swatch
            key={color}
            color={color}
            active={value.toUpperCase() === color.toUpperCase()}
            onClick={() => onPick(color)}
          />
        ))}
      </div>
    </div>
  )
}

/* Les deux champs gardent la frappe en cours à part : une saisie incomplète
   (« FFD4 », un champ vidé) ne s'applique pas et ne se fait pas écraser. Elle
   s'efface à la sortie du champ, qui reprend la valeur réelle. */

function HexField({ value, label, onPick }: { value: string; label: string; onPick: (color: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      type="text"
      value={draft ?? value.slice(1).toUpperCase()}
      aria-label={label}
      spellCheck={false}
      maxLength={7}
      onChange={(event) => {
        const text = event.target.value
        setDraft(text)
        const color = `#${text.replace(/^#/, '')}`
        if (HEX.test(color)) onPick(color)
      }}
      onBlur={() => setDraft(null)}
      className={`${FIELD} min-w-0 flex-1 uppercase`}
    />
  )
}

function PercentField({ value, label, onInput }: { value: number; label: string; onInput: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <label className={`${FIELD} flex w-[62px] shrink-0 items-center gap-1 has-focus-visible:ring-selected`}>
      <input
        type="number"
        min={1}
        max={100}
        step={1}
        value={draft ?? String(Math.round(value * 100))}
        aria-label={label}
        onChange={(event) => {
          const text = event.target.value
          setDraft(text)
          const percent = Number(text)
          // Jamais 0 : une couleur invisible se coupe à sa bascule, pas ici.
          if (text.trim() !== '' && Number.isFinite(percent)) onInput(Math.min(100, Math.max(1, Math.round(percent))) / 100)
        }}
        onBlur={() => setDraft(null)}
        className="w-full min-w-0 bg-transparent text-right outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span aria-hidden className="text-dim">
        %
      </span>
    </label>
  )
}
