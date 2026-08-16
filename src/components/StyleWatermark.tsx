import { DeleteIcon, ImageIcon, POSITION_ICON } from './icons.tsx'
import { Button, DashedTile, SELECTED, Section } from './ui.tsx'
import { WATERMARK_POSITIONS } from '../lib/watermark.ts'
import type { Style, WatermarkPosition } from '../types.ts'

/** Le logo d'un style : dépôt, position, retrait. Trois gestes, une section. */
export default function StyleWatermark({
  style,
  onPick,
  onPatchPosition,
  onRemove,
}: {
  style: Style
  onPick: () => void
  onPatchPosition: (position: WatermarkPosition) => void
  onRemove: () => void
}) {
  const mark = style.watermark

  return (
    <Section title="Watermark">
      <div className="flex items-start gap-4">
        <div className="flex shrink-0 flex-col gap-1.5">
          <DashedTile onClick={onPick} className="h-[86px] w-[122px] font-mono text-[10px]">
            {mark ? (
              <img src={mark.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="flex flex-col items-center gap-1.5">
                <ImageIcon />
                drop logo.svg
              </span>
            )}
          </DashedTile>
          {/* Rien à retirer tant que rien n'est posé : le bouton n'existe pas
              plutôt que d'être un bouton mort de plus. */}
          {mark && (
            <Button variant="ghost" onClick={onRemove} className="justify-center text-danger">
              <DeleteIcon />
              Remove logo
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {WATERMARK_POSITIONS.map((position) => {
            const Icon = POSITION_ICON[position]
            return (
              <button
                key={position}
                type="button"
                title={position}
                aria-label={position}
                aria-pressed={mark?.position === position}
                // Sans logo, la position n'a rien à placer.
                disabled={!mark}
                onClick={() => onPatchPosition(position)}
                className={`flex h-8 w-11 items-center justify-center rounded-sm border transition-colors duration-140 disabled:opacity-40 ${
                  mark?.position === position
                    ? SELECTED
                    : 'border-transparent bg-sunken text-ink-soft hover:text-ink'
                }`}
              >
                <Icon />
              </button>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
