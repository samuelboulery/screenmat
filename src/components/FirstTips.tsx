import { useState } from 'react'
import { CancelIcon } from './icons.tsx'
import Keys from './Keys.tsx'
import { IconButton, Panel } from './ui.tsx'
import { m } from '../lib/i18n/index.ts'

const SEEN_KEY = 'sm-tips-seen'

/** Les trois gestes qu'on ne devine pas en arrivant. Le reste est sous `?`.
 *  `label` est une clé de `m.workspace.tips`, lue au rendu. */
const TIPS = [
  { keys: 'T', label: 'write' },
  { keys: 'Drag', label: 'select' },
  { keys: '⌘E', label: 'export' },
] as const

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch (error) {
    console.warn('[tips] stockage illisible, les astuces restent visibles', error)
    return false
  }
}

/**
 * Trois astuces au premier import, masquables et mémorisées. Pas de visite
 * guidée modale : elles ne bloquent rien et ne reviennent plus une fois fermées.
 */
export default function FirstTips() {
  const [hidden, setHidden] = useState(seen)
  if (hidden) return null

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch (error) {
      console.warn('[tips] fermeture non mémorisée, elle vaut pour cette visite', error)
    }
    setHidden(true)
  }

  return (
    <Panel className="pointer-events-auto flex items-center gap-4 rounded-lg py-1.5 pr-1.5 pl-4">
      {TIPS.map((tip) => (
        <span key={tip.keys} className="t-ui-small flex items-center gap-1.5 whitespace-nowrap text-ink-soft">
          <Keys shortcut={tip.keys} className="text-ink" />
          {m.workspace.tips[tip.label]}
        </span>
      ))}
      <span className="t-ui-small whitespace-nowrap text-dim">
        · <Keys shortcut="?" /> {m.workspace.tips.all}
      </span>
      <IconButton icon={CancelIcon} label={m.workspace.tips.hide} onClick={dismiss} />
    </Panel>
  )
}
