import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

type MenuProps = {
  /** Contenu du bouton déclencheur. */
  trigger: ReactNode
  /** Nom accessible et infobulle du déclencheur. */
  label: string
  /** Classes du déclencheur : un menu s'ouvre depuis un bouton de la DA. */
  triggerClassName: string
  /** Le panneau s'aligne sur le bord droit du déclencheur — la barre haute
   *  les pose à droite, un menu ne doit pas sortir de l'écran. */
  align?: 'left' | 'right'
  className?: string
  /** `close` referme le panneau après une action qui l'a rendu inutile. */
  children: (close: () => void) => ReactNode
}

/**
 * Panneau déroulant, sur le motif du bouton de divulgation : `aria-expanded`
 * sur le déclencheur, contenu libre dessous. `Escape` et un clic dehors le
 * referment, et le focus revient au déclencheur — sans quoi un clavier
 * perdrait sa place en fermant.
 */
export default function Menu({
  trigger,
  label,
  triggerClassName,
  align = 'right',
  className = '',
  children,
}: MenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Un seul `Escape`, une seule chose fermée : pas de désélection derrière.
      event.stopPropagation()
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div
      ref={root}
      className="relative"
      // Tab qui sort du menu le referme : ouvert sans focus, il couvrirait le canvas.
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={button}
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          className={`panel absolute top-[calc(100%+8px)] z-40 max-h-[calc(100vh-90px)] overflow-y-auto rounded-lg p-4 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${className}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
