import StyleWatermark from './StyleWatermark.tsx'
import { DeleteIcon } from './icons.tsx'
import { Button, Section } from './ui.tsx'
import type { useStyleEditing } from '../hooks/useStyleEditing.ts'
import type { Style } from '../types.ts'

type StyleSectionProps = {
  style: Style
  editing: ReturnType<typeof useStyleEditing>
}

/**
 * Ce qu'un style porte au-delà de ses réglages : son nom et son filigrane. Ses
 * couleurs de fond sont des réglages comme les autres (section Background). Affiché sous les réglages du document quand un style est
 * appliqué — l'ancien écran Styles, ramené là où l'on voit l'effet.
 */
export default function StyleSection({ style, editing }: StyleSectionProps) {
  return (
    <>
      <Section title="Style">
        <input
          type="text"
          value={style.name}
          onChange={(event) => editing.onRename(style.id, event.target.value)}
          aria-label="Style name"
          className="w-full rounded-md border border-hairline bg-sunken px-3 py-2 text-[12px] text-ink"
        />
        <p className="t-ui-small text-dim">
          Settings you change here stay in the image until you choose Update in the Styles menu.
        </p>
        <Button variant="danger" onClick={() => editing.onDelete(style.id)} className="w-full justify-center">
          <DeleteIcon />
          Delete style
        </Button>
      </Section>

      <StyleWatermark
        style={style}
        onPick={editing.onPickWatermark}
        onPatchPosition={editing.onPatchWatermark}
        onRemove={editing.onRemoveWatermark}
      />
    </>
  )
}
