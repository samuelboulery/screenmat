import { useCallback, useMemo, useState } from 'react'
import BatchScreen from './components/BatchScreen.tsx'
import EditorScreen from './components/EditorScreen.tsx'
import HistoryScreen from './components/HistoryScreen.tsx'
import ImportScreen from './components/ImportScreen.tsx'
import StylesScreen from './components/StylesScreen.tsx'
import TopBar, { type Mode, type View } from './components/TopBar.tsx'
import TopBarActions from './components/TopBarActions.tsx'
import { ErrorNote } from './components/ui.tsx'
import { useBatch } from './hooks/useBatch.ts'
import { useExport } from './hooks/useExport.ts'
import { useImageInput } from './hooks/useImageInput.ts'
import { useDocumentHistory } from './hooks/useHistory.ts'
import { useLayerActions } from './hooks/useLayerActions.ts'
import { useLibrary } from './hooks/useLibrary.ts'
import { useStyleActions } from './hooks/useStyleActions.ts'
import { useShots } from './hooks/useShots.ts'
import { useSideFile, type SideTarget } from './hooks/useSideFile.ts'
import { useNarrow, useShortcuts } from './hooks/useShortcuts.ts'
import { loadImage } from './lib/image.ts'
import { buildBatchJobs } from './lib/export.ts'
import { computeGeometry } from './lib/render.ts'
import { getHistoryBlobs } from './lib/store.ts'
import { exportStyle } from './lib/styles.ts'
import {
  DEFAULT_COMPOSITION,
  DEFAULT_SETTINGS,
  type Composition,
  type Format,
  type Ratio,
  type Scene,
  type Settings,
  type WatermarkPosition,
} from './types.ts'

/** Ce qu'un `<input type=file>` sert à choisir, selon le bouton cliqué. */
type PickTarget = 'shot' | SideTarget

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [composition, setComposition] = useState<Composition>(DEFAULT_COMPOSITION)
  const [view, setView] = useState<View>('editor')
  const [mode, setMode] = useState<Mode>('compose')
  const [scale, setScale] = useState(2)
  const [failure, setFailure] = useState<string | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)
  const [batchRatios, setBatchRatios] = useState<Ratio[]>(['16:9'])

  const shots = useShots()
  const library = useLibrary()
  const batch = useBatch()
  const narrow = useNarrow()

  const onImages = useCallback(
    (images: HTMLImageElement[], files: File[]) => {
      shots.add(
        images,
        files.map((file) => file.name.replace(/\.[a-z0-9]+$/i, '')),
      )
      setView('editor')
    },
    [shots],
  )

  const input = useImageInput(onImages)

  const patch = (next: Partial<Settings>) => setSettings((current) => ({ ...current, ...next }))
  const compose = (next: Partial<Composition>) =>
    setComposition((current) => ({ ...current, ...next }))

  const styles = useStyleActions(
    library,
    settings,
    setSettings,
    useCallback(() => setView('styles'), []),
  )
  const { activeStyle, watermarkImage } = styles

  /* --- Scène ------------------------------------------------------------ */

  const composed = useMemo(() => {
    if (shots.shots.length === 0) return []
    if (composition.layout === 'single') {
      return shots.activeShot ? [shots.activeShot] : []
    }
    const picked = shots.shots.filter((shot) => shots.selection.includes(shot.id))
    return picked.length > 0 ? picked : shots.shots.slice(0, 1)
  }, [shots.shots, shots.activeShot, shots.selection, composition.layout])

  const scene = useMemo<Scene | null>(() => {
    if (composed.length === 0) return null
    return {
      shots: composed,
      palette: activeStyle?.palette ?? composed[0].palette,
      settings,
      composition,
      backgroundImage: backgroundImage ?? undefined,
      watermark:
        watermarkImage && activeStyle?.watermark
          ? { image: watermarkImage, mark: activeStyle.watermark }
          : undefined,
    }
  }, [composed, settings, composition, activeStyle, backgroundImage, watermarkImage])

  const geometry = useMemo(() => {
    const first = composed[0]
    if (!first) return null
    return computeGeometry(
      first.image.naturalWidth,
      first.image.naturalHeight,
      settings,
      1,
      composition,
      composed.length,
    )
  }, [composed, settings, composition])

  /* --- Export ----------------------------------------------------------- */

  const exporter = useExport(library.addHistory, library.activeStyleId)

  const onExport = useCallback(() => {
    if (scene) void exporter.exportScene(scene, scale)
  }, [scene, scale, exporter])

  const onCopy = useCallback(() => {
    if (scene) void exporter.copyScene(scene, scale)
  }, [scene, scale, exporter])

  /* --- Annulation et raccourcis ----------------------------------------- */

  const history = useDocumentHistory(shots, settings, setSettings, composition, setComposition)
  const layers = useLayerActions(shots)

  useShortcuts(
    {
      ...layers,
      onExport,
      onCopy,
      onShuffle: () => patch({ seed: settings.seed + 1 }),
      onScale: setScale,
      onUndo: history.undo,
      onRedo: history.redo,
    },
    shots.shots.length > 0,
  )


  /* --- Sélecteur de fichiers secondaire --------------------------------- */

  const side = useSideFile({
    onBackground: (image) => {
      setBackgroundImage(image)
      patch({ background: 'image' })
    },
    activeStyle,
    onStyle: (style) => library.saveStyle(style),
    onError: setFailure,
  })

  const pick = (kind: PickTarget) => {
    if (kind === 'shot') input.openPicker()
    else side.open(kind)
  }

  /* --- Historique ------------------------------------------------------- */

  const reopen = useCallback(
    async (id: string) => {
      const entry = library.history.find((item) => item.id === id)
      const blobs = await getHistoryBlobs(id)
      if (!entry || !blobs) return

      shots.replaceAll([await loadImage(blobs.source)], [entry.name])
      setSettings(entry.settings)
      setView('editor')
      setMode('compose')
    },
    [library.history, shots],
  )

  /* --- Batch ------------------------------------------------------------ */

  const startBatch = useCallback(() => {
    if (!scene) return
    const picked = shots.shots.filter((shot) => shots.selection.includes(shot.id))
    const jobs = buildBatchJobs(scene, picked, batchRatios, scale, activeStyle?.palette)
    void batch.start(
      jobs,
      picked.map((shot) => shot.id),
    )
  }, [scene, shots.shots, shots.selection, batchRatios, scale, activeStyle, batch])

  /* --- Rendu ------------------------------------------------------------ */

  const empty = shots.shots.length === 0

  return (
    <div className="stage-glow relative h-full" {...input.dropHandlers}>
      <TopBar
        view={view}
        mode={mode}
        showModes={!empty}
        onView={setView}
        onMode={setMode}
      >
        <TopBarActions
          view={view}
          mode={mode}
          empty={empty}
          output={
            geometry
              ? {
                  width: geometry.width * scale,
                  height: Math.round(geometry.height * scale),
                  format: settings.format,
                }
              : null
          }
          copied={exporter.copied}
          selected={shots.selection.length}
          filesOut={shots.selection.length * batchRatios.length}
          batchRunning={batch.running}
          activeStyle={activeStyle}
          exports={library.history.length}
          bytes={library.bytes}
          onCopy={onCopy}
          onExport={onExport}
          onCancelBatch={batch.cancel}
          onExportBatch={startBatch}
          onExportStyle={exportStyle}
          onSaveStyle={styles.save}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
          onNewShot={() => pick('shot')}
        />
      </TopBar>

      {empty && view === 'editor' ? (
        <ImportScreen
          dragging={input.dragging}
          error={input.error}
          hasLastStyle={Boolean(library.activeStyleId)}
          recents={library.history.slice(0, 4)}
          onPick={() => pick('shot')}
          onUseLastStyle={() => library.activeStyleId && styles.apply(library.activeStyleId)}
          onOpenRecent={(id) => void reopen(id)}
        />
      ) : view === 'editor' && mode === 'batch' ? (
        <BatchScreen
          shots={shots.shots}
          selection={shots.selection}
          queue={batch.queue}
          rendered={batch.rendered}
          total={batch.total}
          style={activeStyle}
          ratios={batchRatios}
          scale={scale}
          format={settings.format}
          onToggleShot={(id) => shots.select(id, true)}
          onToggleRatio={(ratio) =>
            setBatchRatios((current) =>
              current.includes(ratio)
                ? current.filter((item) => item !== ratio)
                : [...current, ratio],
            )
          }
          onScale={setScale}
          onFormat={(format: Format) => patch({ format })}
          onAddShot={() => pick('shot')}
          onChangeStyle={() => setView('styles')}
        />
      ) : view === 'editor' && scene ? (
        <EditorScreen
          mode={mode === 'annotate' ? 'annotate' : 'compose'}
          scene={scene}
          shots={shots.shots}
          activeShotId={shots.activeShotId}
          selection={shots.selection}
          styles={library.styles}
          activeStyleId={library.activeStyleId}
          selectedLayerIds={shots.selectedLayerIds}
          narrow={narrow}
          onChange={patch}
          onCompose={compose}
          onSelectShot={shots.select}
          onReorderShots={shots.reorder}
          onAddShot={() => pick('shot')}
          onApplyStyle={styles.apply}
          onSaveStyle={styles.save}
          onPickBackgroundImage={() => pick('background')}
          onCreateAnnotation={shots.createAnnotation}
          onPatchAnnotation={shots.patchAnnotation}
          onPatchNode={shots.patchNode}
          onTranslateLayers={shots.translateLayers}
          onDeleteLayers={shots.deleteLayers}
          onMoveLayer={shots.moveLayer}
          onMoveLayers={shots.moveLayers}
          onGroupLayers={shots.groupLayers}
          onUngroupLayer={shots.ungroupLayer}
          onSelectLayers={(shotId, ids, additive) => {
            if (shotId) shots.focusShot(shotId)
            shots.selectLayers(ids, additive ? 'toggle' : 'replace')
          }}
        />
      ) : view === 'styles' ? (
        <StylesScreen
          styles={library.styles}
          activeId={library.activeStyleId}
          preview={scene}
          shots={shots.shots}
          sampled={shots.activeShot?.palette ?? null}
          onSelect={styles.apply}
          onRename={(id, name) => {
            const style = library.styles.find((item) => item.id === id)
            if (style) styles.patch({ ...style, name })
          }}
          onPatchWatermark={(position: WatermarkPosition) => {
            if (activeStyle?.watermark) {
              styles.patch({
                ...activeStyle,
                watermark: { ...activeStyle.watermark, position },
              })
            }
          }}
          onPickWatermark={() => pick('watermark')}
          onOverridePalette={(override) => {
            if (!activeStyle) return
            styles.patch({
              ...activeStyle,
              palette: override ? (shots.activeShot?.palette ?? undefined) : undefined,
            })
          }}
          onImport={() => pick('style')}
        />
      ) : (
        <HistoryScreen
          entries={library.history}
          styles={library.styles}
          bytes={library.bytes}
          onOpen={(id) => void reopen(id)}
          onAdd={() => pick('shot')}
          onPurge={() => void library.purge()}
        />
      )}

      {(failure ?? exporter.error ?? library.error ?? batch.error) && (
        <div className="absolute right-5 bottom-5 z-30">
          <ErrorNote>{failure ?? exporter.error ?? library.error ?? batch.error}</ErrorNote>
        </div>
      )}
      {exporter.status && !failure && !exporter.error && (
        <p className="absolute right-5 bottom-5 z-30 font-mono text-[10px] text-dim">{exporter.status}</p>
      )}

      <input
        ref={input.inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={input.onInputChange}
        className="sr-only"
        aria-label="Choisir un ou plusieurs screenshots"
      />
      <input
        ref={side.inputRef}
        type="file"
        accept="image/*,application/json,.json"
        onChange={side.onChange}
        className="sr-only"
        aria-label="Choisir un fichier"
      />
    </div>
  )
}
