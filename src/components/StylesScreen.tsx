import Preview from './Preview.tsx'
import StylePalette from './StylePalette.tsx'
import StyleWatermark from './StyleWatermark.tsx'
import { FRAMES } from './Inspector.tsx'
import { DeleteIcon, FRAME_ICON, JsonIcon, SaveStyleIcon } from './icons.tsx'
import { Button, DashedTile, MonoLabel, Row, Section, Segmented, Slider, Tile } from './ui.tsx'
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
  onRemoveWatermark: () => void
  onOverridePalette: (override: boolean) => void
  onPatchColor: (index: number, color: string) => void
  onAddColor: (color: string) => void
  onRemoveColor: (index: number) => void
  onEditInEditor: (id: string) => void
  onDelete: (id: string) => void
  onImport: () => void
  /** Écrire le style affiché dans un `.json` — descendu de la barre haute. */
  onExportStyle: (style: Style) => void
  /** Enregistrer les réglages courants de l'éditeur comme nouveau style. */
  onSaveStyle: () => void
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
  onRemoveWatermark,
  onOverridePalette,
  onPatchColor,
  onAddColor,
  onRemoveColor,
  onEditInEditor,
  onDelete,
  onImport,
  onExportStyle,
  onSaveStyle,
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
        {/* C'est ici que naissent les styles : l'un vient d'un fichier, l'autre
            des réglages en cours dans l'éditeur. Les deux au pied de la liste
            qu'ils alimentent, plutôt que dans la barre haute. */}
        <div className="mt-auto flex shrink-0 flex-col gap-2">
          <Button variant="secondary" onClick={onSaveStyle} className="justify-center">
            <SaveStyleIcon />
            Save current settings
          </Button>
          <DashedTile onClick={onImport} className="h-11 gap-1.5 font-mono text-[10px]">
            <JsonIcon />
            Import .json
          </DashedTile>
        </div>
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
              <Button onClick={() => onExportStyle(active)} className="shrink-0">
                <JsonIcon />
                Export .json
              </Button>
              <Button variant="primary" onClick={() => onEditInEditor(active.id)} className="shrink-0">
                Edit in editor
              </Button>
            </div>

            <StyleWatermark
              style={active}
              onPick={onPickWatermark}
              onPatchPosition={onPatchWatermark}
              onRemove={onRemoveWatermark}
            />

            <StylePalette
              palette={palette}
              frozen={Boolean(active.palette)}
              onOverride={onOverridePalette}
              onColor={onPatchColor}
              onAdd={onAddColor}
              onRemove={onRemoveColor}
            />

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
