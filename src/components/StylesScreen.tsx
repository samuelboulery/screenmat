import Preview from './Preview.tsx'
import { FRAMES } from './Inspector.tsx'
import { AddIcon, DeleteIcon, FRAME_ICON, ImageIcon, JsonIcon, POSITION_ICON } from './icons.tsx'
import {
  Button,
  DashedTile,
  MonoLabel,
  Row,
  Section,
  Segmented,
  Slider,
  Tile,
  Toggle,
} from './ui.tsx'
import { WATERMARK_POSITIONS } from '../lib/watermark.ts'
import type { Palette, Scene, Settings, Shot, Style, WatermarkPosition } from '../types.ts'

type StylesScreenProps = {
  styles: readonly Style[]
  activeId: string | null
  /** Scène rendue avec le style en cours d'édition. Null tant qu'aucun shot. */
  preview: Scene | null
  shots: readonly Shot[]
  sampled: Palette | null
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onPatchSettings: (patch: Partial<Settings>) => void
  onPatchWatermark: (position: WatermarkPosition) => void
  onPickWatermark: () => void
  onOverridePalette: (override: boolean) => void
  onEditInEditor: (id: string) => void
  onDelete: (id: string) => void
  onImport: () => void
  /** Sous 1100 px : les deux colonnes latérales s'empilent sous le centre. */
  narrow?: boolean
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
  onPatchSettings,
  onPatchWatermark,
  onPickWatermark,
  onOverridePalette,
  onEditInEditor,
  onDelete,
  onImport,
  narrow = false,
}: StylesScreenProps) {
  const active = styles.find((style) => style.id === activeId) ?? null
  const palette = active?.palette ?? sampled

  return (
    // Trois colonnes fixes tenaient jusqu'à ce qu'on zoome : à 200 %, la colonne
    // centrale tombait à 56 px et un tiers de l'aperçu sortait du scroll. En
    // dessous du point de rupture, elles s'empilent.
    <div
      className={`stage-glow absolute inset-x-0 top-[58px] bottom-0 grid ${
        narrow ? 'grid-cols-1 overflow-y-auto' : 'grid-cols-[236px_1fr_620px] overflow-hidden'
      }`}
    >
      <aside
        className={`flex flex-col gap-2 border-white/5 p-5 ${
          narrow ? 'border-b' : 'overflow-y-auto border-r'
        }`}
      >
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

      <div className={`flex flex-col gap-6 p-7 ${narrow ? '' : 'overflow-y-auto'}`}>
        {active ? (
          <>
            <div className="flex items-center gap-4">
              <input
                value={active.name}
                onChange={(event) => onRename(active.id, event.target.value)}
                aria-label="Style name"
                className="t-title min-w-0 flex-1 bg-transparent text-ink outline-none"
              />
              <Button onClick={() => onEditInEditor(active.id)} className="shrink-0">
                Edit in editor
              </Button>
            </div>

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
                        // Sans logo, la position n'a rien à placer : le bouton
                        // se voit mort plutôt que d'avaler le clic.
                        disabled={!active.watermark}
                        onClick={() => onPatchWatermark(position)}
                        className={`flex h-8 w-11 items-center justify-center rounded-sm border transition-colors duration-140 disabled:opacity-40 ${
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
                    // Figer une palette suppose qu'il y en ait une à figer.
                    disabled={!sampled && !active.palette}
                    title={
                      !sampled && !active.palette ? 'Load a shot to sample colors first' : undefined
                    }
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

            {/* Les quatre réglages qu'on change le plus souvent. Le reste se
                règle dans l'éditeur et revient par « Update ». Aucun bouton
                d'enregistrement : l'écriture est immédiate, comme le nom. */}
            <Section title="Locked in this style">
              <div className="grid grid-cols-4 gap-1">
                {FRAMES.map((frame) => {
                  const Icon = FRAME_ICON[frame.value]
                  return (
                    <Tile
                      key={frame.value}
                      active={active.settings.frame === frame.value}
                      onClick={() => onPatchSettings({ frame: frame.value })}
                      className="h-12 font-mono text-[10px]"
                    >
                      <Icon />
                      {frame.label}
                    </Tile>
                  )
                })}
              </div>
              <Slider
                label="Padding"
                value={active.settings.padding}
                display={`${Math.round(active.settings.padding * 100)} %`}
                min={0}
                max={0.2}
                step={0.005}
                onInput={(padding) => onPatchSettings({ padding })}
              />
              <Slider
                label="Grain"
                value={active.settings.grain}
                display={`${Math.round(active.settings.grain * 100)} %`}
                min={0}
                max={1}
                step={0.05}
                onInput={(grain) => onPatchSettings({ grain })}
              />
              <Segmented
                className="w-full"
                options={[
                  { value: 'png', label: 'PNG' },
                  { value: 'webp', label: 'WebP' },
                ]}
                value={active.settings.format}
                onPick={(format) => onPatchSettings({ format })}
              />
            </Section>

            <p className="t-ui text-dim">
              Styles live in this browser. Exporting a <code>.json</code> is the only way to share
              one — there is no account and no server.
            </p>

            <Button
              variant="ghost"
              onClick={() => onDelete(active.id)}
              className="mr-auto text-danger"
            >
              <DeleteIcon />
              Delete style
            </Button>
          </>
        ) : (
          <p className="t-body text-dim">
            No style yet. Save one from the editor’s Presets section, or import a{' '}
            <code>.json</code>.
          </p>
        )}
      </div>

      <aside
        className={`flex flex-col gap-4 border-white/5 p-7 ${
          narrow ? 'border-t' : 'overflow-y-auto border-l'
        }`}
      >
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
