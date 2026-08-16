import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './ui.tsx'

/* Confirmation aux couleurs de l'app, sur l'élément natif `<dialog>` : piège du
   focus, restitution du focus à la fermeture, `Esc`, inertie du reste de la
   page et `::backdrop` sont dans la plateforme. En réimplémenter la moitié en
   React serait la partie coûteuse — et celle qu'on raterait. */

export type ConfirmRequest = {
  title: string
  body: ReactNode
  /** Libellé du bouton d'action : ce qu'il fait, pas « OK ». */
  action: string
  /** Une suppression porte le rouge, jamais le dégradé d'accent. */
  tone?: 'danger'
}

/**
 * Renvoie la fonction à appeler pour demander confirmation, et le dialogue à
 * monter **une seule fois** dans l'arbre. Toutes les confirmations de l'app
 * passent par le même nœud.
 */
export function useConfirm(): {
  confirm: (request: ConfirmRequest) => Promise<boolean>
  dialog: ReactNode
} {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const settle = useRef<((ok: boolean) => void) | null>(null)
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  const confirm = useCallback((next: ConfirmRequest) => {
    setRequest(next)
    return new Promise<boolean>((resolve) => {
      settle.current = resolve
    })
  }, [])

  /** Sortie unique — bouton, `Esc` ou clic hors boîte : une promesse laissée en
   *  suspens bloquerait l'appelant pour de bon. `settle` vidé rend l'appel
   *  idempotent, et `close()` rappelle ce chemin par `onClose`. */
  const close = useCallback((ok: boolean) => {
    settle.current?.(ok)
    settle.current = null
    ref.current?.close()
    setRequest(null)
  }, [])

  const danger = request?.tone === 'danger'

  // L'ouverture attend le rendu du contenu : `showModal()` place le focus, et
  // il n'y aurait rien à focaliser sur une boîte encore vide.
  useEffect(() => {
    if (!request) return
    ref.current?.showModal()
    // Une action destructive ne se valide pas à l'aveugle sur `Entrée`.
    const target = request.tone === 'danger' ? cancelRef.current : actionRef.current
    target?.focus()
  }, [request])

  const dialog = (
    <dialog
      ref={ref}
      onClose={() => close(false)}
      className="panel m-auto w-[380px] max-w-[calc(100vw-40px)] rounded-lg p-5 text-ink backdrop:bg-stage/70"
    >
      {request && (
        <>
          <h2 className="t-card-title">{request.title}</h2>
          <div className="t-body mt-2 text-ink-soft">{request.body}</div>
          <div className="mt-5 flex justify-end gap-2">
            <Button ref={cancelRef} onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              ref={actionRef}
              variant={danger ? 'danger' : 'primary'}
              onClick={() => close(true)}
            >
              {request.action}
            </Button>
          </div>
        </>
      )}
    </dialog>
  )

  return { confirm, dialog }
}
