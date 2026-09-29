import StylePalette from './StylePalette.tsx'
import StyleWatermark from './StyleWatermark.tsx'
import { DeleteIcon } from './icons.tsx'
import { Button, Section } from './ui.tsx'
import type { useStyleEditing } from '../hooks/useStyleEditing.ts'
import type { Palette, Style } from '../types.ts'

type StyleSectionProps = {
  style: Style
  /** Palette échantillonnée du shot actif, montrée tant que le style n'en fige
   *  pas une. */
  sampled: Palette | null
  editing: ReturnType<typeof useStyleEditing>
}

/**
 * Ce qu'un style porte au-delà de ses réglages : son nom, son filigrane, sa
 * palette figée. Affiché sous les réglages du document quand un style est
 * appliqué — l'ancien écran Styles, ramené là où l'on voit l'effet.
 */
export default function StyleSection({ style, sampled, editing }: StyleSectionProps) {
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

      <StylePalette
        palette={style.palette ?? sampled}
        frozen={Boolean(style.palette)}
        onOverride={editing.onOverridePalette}
        onColor={editing.onPatchColor}
        onAdd={editing.onAddColor}
        onRemove={editing.onRemoveColor}
      />
    </>
  )
}
