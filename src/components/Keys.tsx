import { MAC, keycaps } from '../lib/keys.ts'

type KeysProps = {
  /** La touche telle que la table l'écrit : `T`, `⇧⌘Z`, `⌥ drag`. */
  shortcut: string
  className?: string
}

/**
 * Un raccourci, une capsule par touche, écrit pour le clavier de celui qui
 * regarde : ⌘ ⇧ ⌥ sur un Mac, Ctrl Shift Alt ailleurs. Les symboles prennent la
 * police système (`t-key-glyph`) — la mono embarquée ne les a pas, et leur
 * repli à 10 px ne se lisait pas.
 */
export default function Keys({ shortcut, className = '' }: KeysProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      {keycaps(shortcut, MAC).map((part, index) =>
        part.kind === 'word' ? (
          <span key={index} className="t-ui-small">
            {part.text}
          </span>
        ) : (
          <span key={index} className="inline-flex items-center gap-0.5">
            {part.caps.map((cap, at) => (
              <kbd key={at} className={cap.glyph ? 't-key t-key-glyph' : 't-key'}>
                {cap.text}
              </kbd>
            ))}
          </span>
        ),
      )}
    </span>
  )
}
