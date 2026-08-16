import Preview from './Preview.tsx'
import { AddIcon, ImageIcon, JsonIcon, POSITION_ICON } from './icons.tsx'
import { DashedTile, MonoLabel, Row, Section, Toggle } from './ui.tsx'
import { WATERMARK_POSITIONS } from '../lib/watermark.ts'
import type { Palette, Scene, Shot, Style, WatermarkPosition } from '../types.ts'

type StylesScreenProps = {
  styles: readonly Style[]
  activeId: string | null
  /** Scène rendue avec le style en cours d'édition. Null tant qu'aucun shot. */
  preview: Scene | null
  shots: readonly Shot[]
  sampled: Palette | null
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onPatchWatermark: (position: WatermarkPosition) => void
  onPickWatermark: () => void
  onOverridePalette: (override: boolean) => void
  onImport: () => void
}

/** Un style est un objet local, partageable par fichier. Pas de « brand kit ». */
export default function StylesScreen({
  styles,
  activeId,
  preview,
  shots,
  sampled,
  onSelect,
  onRename,
  onPatchWatermark,
  onPickWatermark,
  onOverridePalette,
  onImport,
}: StylesScreenProps) {
  const active = styles.find((style) => style.id === activeId) ?? null
  const palette = active?.palette ?? sampled

  return (
    <div className="stage-glow absolute inset-x-0 top-[58px] bottom-0 grid grid-cols-[236px_1fr_620px] overflow-hidden">
      <aside className="flex flex-col gap-2 overflow-y-auto border-r border-white/5 p-5">
        <MonoLabel>Saved — {styles.length}</MonoLabel>
        <div className="space-y-1">
          {styles.map((style) => (
            <Row key={style.id} active={style.id === activeId} onClick={() => onSelect(style.id)}>
              <span className="h-[19px] w-[26px] shrink-0 rounded-xs border border-hairline bg-sunken" />
              <span className="t-ui truncate">{style.name}</span>
            </Row>
          ))}
        </div>
        <DashedTile onClick={onImport} className="mt-auto h-11 shrink-0 gap-1.5 font-mono text-[10px]">
          <JsonIcon />
          Import .json
        </DashedTile>
      </aside>

      <div className="flex flex-col gap-6 overflow-y-auto p-7">
        {active ? (
          <>
            <input
              value={active.name}
              onChange={(event) => onRename(active.id, event.target.value)}
              aria-label="Style name"
              className="t-title w-full bg-transparent text-ink outline-none"
            />

            <Section title="Watermark">
              <div className="flex items-start gap-4">
                <DashedTile
                  onClick={onPickWatermark}
                  className="h-[86px] w-[122px] shrink-0 font-mono text-[10px]"
                >
                  {active.watermark ? (
                    <img
                      src={active.watermark.dataUrl}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-1.5">
                      <ImageIcon />
                      drop logo.svg
                    </span>
                  )}
                </DashedTile>

                <div className="grid grid-cols-3 gap-1.5">
                  {WATERMARK_POSITIONS.map((position) => {
                    const Icon = POSITION_ICON[position]
                    return (
                      <button
                        key={position}
                        type="button"
                        title={position}
                        aria-label={position}
                        aria-pressed={active.watermark?.position === position}
                        onClick={() => onPatchWatermark(position)}
                        className={`flex h-8 w-11 items-center justify-center rounded-sm border transition-colors duration-140 ${
                          active.watermark?.position === position
                            ? 'border-accent/45 bg-accent/[.14] text-accent-ink'
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

            <Section
              title="Palette"
              aside={
                <span className="flex items-center gap-2.5">
                  <span className="t-ui-small text-ink-soft">Override sampled colors</span>
                  <Toggle
                    checked={Boolean(active.palette)}
                    onChange={onOverridePalette}
                    label="Override sampled colors"
                  />
                </span>
              }
            >
              <div className="flex gap-1.5">
                {palette &&
                  [palette.base, ...palette.accents].map((color) => (
                    <span
                      key={color}
                      title={color}
                      style={{ background: color }}
                      className="h-10 w-[54px] rounded-md border border-white/10"
                    />
                  ))}
                <DashedTile
                  className="h-10 w-[54px]"
                  title="Add a color"
                  aria-label="Add a color"
                  disabled
                >
                  <AddIcon />
                </DashedTile>
              </div>
            </Section>

            <Section title="Locked in this style">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Frame', active.settings.frame],
                  ['Padding', `${Math.round(active.settings.padding * 100)} %`],
                  ['Grain', `${Math.round(active.settings.grain * 100)} %`],
                  ['Export', active.settings.format.toUpperCase()],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-md border border-white/[.06] bg-white/[.03] px-3.5 py-3"
                  >
                    <span className="t-ui text-ink-soft">{label}</span>
                    <span className="t-ui text-ink">{value}</span>
                  </div>
                ))}
              </div>
            </Section>

            <p className="t-ui text-dim">
              Styles live in this browser. Exporting a <code>.json</code> is the only way to share
              one — there is no account and no server.
            </p>
          </>
        ) : (
          <p className="t-body text-dim">
            No style yet. Save one from the editor’s Presets section, or import a{' '}
            <code>.json</code>.
          </p>
        )}
      </div>

      <aside className="flex flex-col gap-4 overflow-y-auto border-l border-white/5 p-7">
        <MonoLabel>Live preview</MonoLabel>
        <div className="relative h-[308px] w-full overflow-hidden rounded-lg border border-hairline bg-sunken">
          {preview && <Preview scene={preview} />}
        </div>

        <MonoLabel>Applies to</MonoLabel>
        <div className="flex gap-3">
          {shots.slice(0, 3).map((shot) => (
            <span
              key={shot.id}
              className="h-[62px] w-24 overflow-hidden rounded-md border border-hairline bg-sunken"
            >
              <img src={shot.image.src} alt="" className="size-full object-cover" />
            </span>
          ))}
        </div>
        <p className="t-ui text-dim">
          Editing a style re-renders every shot in the batch that uses it.
        </p>
      </aside>
    </div>
  )
}
