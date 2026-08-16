import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from './icons.tsx'

/* Composants de base de la DA « Afterglow ». Un seul accent, pour exactement
   deux choses : l'action primaire et la sélection courante. */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant = 'secondary', className = '', ...rest }: ButtonProps) {
  const styles = {
    primary: 'gradient-accent text-stage font-semibold',
    secondary: 'border border-hairline-strong text-ink hover:border-white/20',
    ghost: 'text-ink-soft hover:text-ink',
  }[variant]

  return (
    <button
      type="button"
      className={`t-ui inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 transition-colors duration-140 disabled:opacity-40 ${styles} ${className}`}
      {...rest}
    />
  )
}

/**
 * Bouton icône-seule : barres denses, lignes de calque, poignées de panneau.
 * `label` est obligatoire et alimente à la fois l'infobulle et le nom
 * accessible — sans texte à lire, l'oublier rendrait le bouton muet.
 */
export function IconButton({
  icon: Icon,
  label,
  active,
  tone,
  className = '',
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  tone?: 'danger'
}) {
  const color = tone === 'danger' ? 'text-danger' : active ? 'text-ink' : 'text-ink-soft'

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-140 hover:bg-white/[.04] hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent ${color} ${className}`}
      {...rest}
    >
      <Icon />
    </button>
  )
}

export function Badge({ children, tone }: { children: ReactNode; tone?: 'accent' | 'danger' }) {
  const color =
    tone === 'accent'
      ? 'text-accent border-accent/30'
      : tone === 'danger'
        ? 'text-danger border-danger/30'
        : 'text-dim border-[#23232C]'
  return (
    <span className={`rounded-xs border px-[7px] py-1 font-mono text-[10px] ${color}`}>{children}</span>
  )
}

/** Panneau flottant : translucide quand le navigateur sait, opaque sinon. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`panel rounded-lg ${className}`}>{children}</div>
}

export function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`t-mono-label ${className}`}>{children}</div>
}

export function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3 border-t border-hairline pt-4 first:border-0 first:pt-0">
      <div className="flex items-center justify-between">
        <MonoLabel>{title}</MonoLabel>
        {aside}
      </div>
      {children}
    </section>
  )
}

export type Option<T extends string> = { value: T; label: ReactNode; title?: string }

export function Segmented<T extends string>({
  options,
  value,
  onPick,
  className = '',
}: {
  options: ReadonlyArray<Option<T>>
  value: T
  onPick: (value: T) => void
  className?: string
}) {
  return (
    <div
      className={`inline-flex gap-1 rounded-md border border-hairline bg-sunken p-[3px] ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          aria-pressed={value === option.value}
          onClick={() => onPick(option.value)}
          className={`t-ui flex items-center gap-1.5 rounded-sm px-3 py-1.5 transition-colors duration-140 ${
            value === option.value ? 'bg-raised text-white' : 'text-ink-soft hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onInput,
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onInput: (value: number) => void
}) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0

  return (
    <label className="block space-y-2">
      <span className="flex items-baseline justify-between">
        <span className="t-mono-label">{label}</span>
        <span className="t-ui-small text-ink">{display}</span>
      </span>
      <input
        type="range"
        className="sf-slider"
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onInput(Number(event.target.value))}
      />
    </label>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-[34px] shrink-0 rounded-full transition-colors duration-140 ${
        checked ? 'bg-accent/35' : 'bg-white/[.09]'
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full transition-all duration-140 ${
          checked ? 'left-4 bg-accent' : 'left-0.5 bg-dim'
        }`}
      />
    </button>
  )
}

/** Case d'outil ou de preset. La sélection est un fond translucide accent. */
export function Tile({
  active,
  tone = 'accent',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  tone?: 'accent' | 'danger' | 'raised'
}) {
  const selected =
    tone === 'danger'
      ? 'bg-danger/[.12] border-danger/35 text-[#FFC9C9]'
      : tone === 'raised'
        ? 'bg-raised border-transparent text-white'
        : 'bg-accent/[.14] border-accent/45 text-accent-ink'

  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex flex-col items-center justify-center gap-1 rounded-md border transition-colors duration-140 ${
        active ? selected : 'border-transparent bg-sunken text-ink-soft hover:text-ink'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Ligne de liste (calques, styles, ratios). */
export function Row({
  active,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2.5 text-left transition-colors duration-140 ${
        active
          ? 'border-accent/30 bg-accent/10 text-ink'
          : 'border-transparent text-ink-soft hover:bg-white/[.03] hover:text-ink'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Swatch({
  color,
  active,
  onClick,
  title,
}: {
  color: string
  active?: boolean
  onClick?: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      title={title ?? color}
      aria-pressed={active}
      onClick={onClick}
      style={{ background: color }}
      className={`size-10 rounded-md border border-white/10 ${active ? 'ring-selected' : ''}`}
    />
  )
}

/** Case pointillée : ajouter, importer, déposer. */
export function DashedTile({
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`flex items-center justify-center rounded-md border border-dashed border-white/15 text-dim transition-colors duration-140 hover:border-white/25 hover:text-ink-soft ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Message d'erreur, au plus près de sa cause. Pas de toast : c'est un outil. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] text-danger">{children}</p>
}
