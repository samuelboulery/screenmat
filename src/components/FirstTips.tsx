import { useState } from 'react'
import { CancelIcon } from './icons.tsx'
import { IconButton, Panel } from './ui.tsx'

const SEEN_KEY = 'sm-tips-seen'

/** Les trois gestes qu'on ne devine pas en arrivant. Le reste est sous `?`. */
const TIPS = [
  { keys: 'T', label: 'to write' },
  { keys: 'Drag', label: 'to select' },
  { keys: '⌘E', label: 'to export' },
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
          <kbd className="t-mono-micro rounded-xs border border-hairline-strong px-1.5 py-0.5 text-ink">{tip.keys}</kbd>
          {tip.label}
        </span>
      ))}
      <span className="t-ui-small whitespace-nowrap text-dim">
        · <kbd className="t-mono-micro">?</kbd> for all
      </span>
      <IconButton icon={CancelIcon} label="Hide tips" onClick={dismiss} />
    </Panel>
  )
}
