import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'
import { CheckIcon, CollapsedIcon, type LucideIcon } from './icons.tsx'

/* Composants de base de la DA « Afterglow ». Un seul accent, pour exactement
   deux choses : l'action primaire et la sélection courante. */

/* Deux recettes de sélection, pas six. Elles se définissent ici et nulle part
   ailleurs — un composant qui réécrit la chaîne fait diverger la DA au premier
   ajustement d'opacité.

   `SWITCH_ON` marque un **commutateur** : ce qui change de vue ou de réglage
   (navigation, instrument, ratio, format). Neutre, parce qu'il y en a toujours
   un d'allumé et que l'accent y perdrait son sens.

   `SELECTED` marque un **contenu sélectionné** : ce sur quoi la prochaine
   action portera (un shot, un calque, un style, un preset). C'est là que
   l'accent gagne sa place. Une image ou une couleur, elles, prennent
   `ring-selected` : un fond teinté mentirait sur ce qu'elles montrent. */
export const SWITCH_ON = 'bg-raised text-white'
export const SELECTED = 'border-accent/35 bg-accent/12 text-accent-ink'
/** Même recette pour ce qui touche au floutage — l'accent y est interdit. */
export const SELECTED_DANGER = 'border-danger/35 bg-danger/12 text-[#FFC9C9]'

/* `ComponentProps<'button'>` plutôt que `ButtonHTMLAttributes` : `ref` en fait
   partie, et le dialogue de confirmation a besoin de poser le focus initial sur
   l'un de ses deux boutons. */
type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

/* Le gabarit commun de ce qui se clique en ligne — même hauteur, même rythme,
   que ce soit un `<button>` ou un `<a>`. */
const CONTROL = 't-ui inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 transition-colors duration-140'
/** La recette discrète : rien à annoncer, on ne la voit qu'au survol. */
const GHOST = 'text-ink-soft hover:text-ink'

export function Button({ variant = 'secondary', className = '', ...rest }: ButtonProps) {
  const styles = {
    primary: 'gradient-accent text-stage font-semibold',
    secondary: 'border border-hairline-strong text-ink hover:border-white/20',
    ghost: GHOST,
    // Le destructif porte `#FF9A9A`, jamais le dégradé d'accent : l'accent est
    // réservé à l'action primaire. Une variante, pas une classe surchargée —
    // Tailwind trie ses utilitaires par ordre de feuille, pas par ordre d'écriture.
    danger: 'border border-danger/40 text-danger hover:border-danger/70',
  }[variant]

  return (
    <button
      type="button"
      className={`${CONTROL} disabled:opacity-40 ${styles} ${className}`}
      {...rest}
    />
  )
}

/**
 * Lien vers une page servie à côté de l'app, ouverte dans un onglet. Ni
 * `SWITCH_ON` ni `SELECTED` : un lien ne s'allume pas — il n'y a pas d'état à
 * marquer — et ce n'est pas non plus un contenu sur lequel la prochaine action
 * porterait. Il prend donc la recette discrète, celle du bouton `ghost`.
 */
export function ExternalLink({ className = '', ...rest }: ComponentProps<'a'>) {
  return <a target="_blank" rel="noreferrer" className={`${CONTROL} ${GHOST} ${className}`} {...rest} />
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

/**
 * Une section de panneau, avec son titre. Le titre est un vrai `<h2>` : c'est la
 * seule structure de parcours d'un outil qui compte six écrans et une dizaine de
 * panneaux. `MonoLabel` reste un `div` — il sert aussi d'étiquette simple, et un
 * seed n'est pas un titre.
 */
export function Section({
  title,
  aside,
  collapsible = false,
  open = false,
  children,
}: {
  title: string
  aside?: ReactNode
  /** Repliable : l'inspecteur unique porte neuf sections dans 288 px. */
  collapsible?: boolean
  open?: boolean
  children: ReactNode
}) {
  const frame = 'space-y-3 border-t border-hairline pt-4 first:border-0 first:pt-0'

  // `<details>` natif plutôt qu'un état et un `aria-expanded` à la main : le
  // clavier, le nom accessible et la recherche dans la page marchent seuls.
  // ponytail: l'ouverture n'est pas persistée — la poser dans `localStorage`
  // (comme `LAST_STYLE_KEY`, lib/styles.ts) si le repli se refait chaque session.
  if (collapsible) {
    return (
      <details open={open} className={`group ${frame}`}>
        <summary className="flex list-none items-center justify-between [&::-webkit-details-marker]:hidden">
          <h2 className="t-mono-label flex items-center gap-1.5">
            <CollapsedIcon className="size-3 transition-transform duration-140 group-open:rotate-90" />
            {title}
          </h2>
          {aside}
        </summary>
        <div className="space-y-3 pt-3">{children}</div>
      </details>
    )
  }

  return (
    <section className={frame}>
      <div className="flex items-center justify-between">
        <h2 className="t-mono-label">{title}</h2>
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
          // Un libellé que la largeur peut masquer (`display:none`) sort aussi du
          // nom accessible : `title` sert alors de nom, et il ne bouge pas.
          aria-label={option.title}
          aria-pressed={value === option.value}
          onClick={() => onPick(option.value)}
          className={`t-ui flex items-center gap-1.5 rounded-sm px-3 py-1.5 transition-colors duration-140 ${
            value === option.value ? SWITCH_ON : 'text-ink-soft hover:text-ink'
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
  disabled,
  title,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      title={title}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-[34px] shrink-0 rounded-full transition-colors duration-140 disabled:opacity-40 ${
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

/** Case de preset ou de commutateur. `tone` dit laquelle des deux recettes. */
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
      ? SELECTED_DANGER
      : tone === 'raised'
        ? `border-transparent ${SWITCH_ON}`
        : SELECTED

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
        active ? SELECTED : 'border-transparent text-ink-soft hover:bg-white/[.03] hover:text-ink'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * Case à cocher, une seule taille et une seule bordure. Purement visuelle : le
 * bouton qui la porte annonce déjà son état par `aria-pressed`, une seconde
 * annonce ferait doublon au lecteur d'écran.
 */
export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-[15px] shrink-0 items-center justify-center rounded-xs ${
        checked ? 'bg-accent text-stage' : 'border-[1.5px] border-white/20'
      }`}
    >
      {checked && <CheckIcon className="size-2.5" />}
    </span>
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
