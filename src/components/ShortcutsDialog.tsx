import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CancelIcon } from './icons.tsx'
import Keys from './Keys.tsx'
import { IconButton, MonoLabel } from './ui.tsx'
import { SHORTCUTS, type ShortcutEntry } from '../hooks/useShortcuts.ts'
import { MAC, keyLabel } from '../lib/keys.ts'
import { TOOLS, TOOL_KEYS, TOOL_TITLES } from '../lib/tools.ts'

/** Les outils ouvrent le panneau : c'est ce qu'on cherche en premier. */
const TOOL_GROUP = {
  title: 'Tools',
  hint: 'Single keys, when the canvas has focus',
  items: TOOLS.map((tool): ShortcutEntry => ({ keys: TOOL_KEYS[tool], label: TOOL_TITLES[tool] })),
}

/**
 * Le panneau des raccourcis, sur `?` ou le bouton de la barre haute. Même
 * `<dialog>` natif que la confirmation : focus piégé puis rendu, `Esc`, fond
 * inerte. Il ne lit que `SHORTCUTS` et `TOOL_KEYS` — aucune touche n'est
 * réécrite ici : `Keys` les met en capsules, pour le clavier de la plateforme.
 */
export function useShortcutsPanel(): { open: () => void; dialog: ReactNode } {
  const ref = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState(false)

  const open = useCallback(() => setShown(true), [])

  useEffect(() => {
    if (shown && !ref.current?.open) ref.current?.showModal()
  }, [shown])

  const dialog = (
    <dialog
      ref={ref}
      aria-label="Keyboard shortcuts"
      onClose={() => setShown(false)}
      // Clic sur le fond : la cible est le `<dialog>` lui-même.
      onClick={(event) => event.target === event.currentTarget && ref.current?.close()}
      className="panel m-auto max-h-[calc(100vh-40px)] w-[680px] max-w-[calc(100vw-40px)] overflow-y-auto rounded-lg p-0 text-ink backdrop:bg-stage/70"
    >
      {/* Le contenu porte le padding : un clic dans la marge n'est pas un clic
          sur le fond. */}
      {shown && (
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="t-card-title">Keyboard shortcuts</h2>
            <IconButton icon={CancelIcon} label="Close" onClick={() => ref.current?.close()} />
          </div>
          <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {[TOOL_GROUP, ...SHORTCUTS].map((group) => (
              <section key={group.title} className="space-y-2">
                <MonoLabel>{group.title}</MonoLabel>
                <p className="t-ui-small text-dim">{group.hint}</p>
                <dl className="space-y-1.5">
                  {group.items.map((item) => (
                    <div key={item.keys} className="flex items-center justify-between gap-4">
                      <dt className="t-ui text-ink-soft">{keyLabel(item.label, MAC)}</dt>
                      <dd>
                        <Keys shortcut={item.keys} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      )}
    </dialog>
  )

  return { open, dialog }
}
