import { useCallback, useState } from 'react'
import BatchScreen from './components/BatchScreen.tsx'
import { useConfirm } from './components/ConfirmDialog.tsx'
import EditorScreen from './components/EditorScreen.tsx'
import HistoryScreen from './components/HistoryScreen.tsx'
import ImportScreen from './components/ImportScreen.tsx'
import StylesScreen from './components/StylesScreen.tsx'
import TopBar from './components/TopBar.tsx'
import { ErrorNote } from './components/ui.tsx'
import { useBatch } from './hooks/useBatch.ts'
import { useDocument } from './hooks/useDocument.ts'
import { useExport } from './hooks/useExport.ts'
import { useImageInput } from './hooks/useImageInput.ts'
import { useDocumentHistory } from './hooks/useHistory.ts'
import { useLayerActions } from './hooks/useLayerActions.ts'
import { useLibrary } from './hooks/useLibrary.ts'
import { useScene } from './hooks/useScene.ts'
import { useStyleActions } from './hooks/useStyleActions.ts'
import { useStyleScreen } from './hooks/useStyleScreen.ts'
import { useShots } from './hooks/useShots.ts'
import { useSideFile, type SideTarget } from './hooks/useSideFile.ts'
import { useNarrow, useShortcuts } from './hooks/useShortcuts.ts'
import { loadImage } from './lib/image.ts'
import { buildBatchJobs } from './lib/export.ts'
import { getHistoryBlobs } from './lib/store.ts'
import { exportStyle, parseSettings } from './lib/styles.ts'
import { type Format, type Ratio, type Screen } from './types.ts'

/** Ce qu'un `<input type=file>` sert à choisir, selon le bouton cliqué. */
type PickTarget = 'shot' | SideTarget

export default function App() {
  const [screen, setScreen] = useState<Screen>('edit')
  const [failure, setFailure] = useState<string | null>(null)
  const [batchRatios, setBatchRatios] = useState<Ratio[]>(['16:9'])
  const [harmonize, setHarmonize] = useState(false)

  const doc = useDocument()
  const { settings, setSettings, composition, setComposition, scale, setScale, patch, compose } = doc

  const shots = useShots()
  const library = useLibrary()
  const batch = useBatch()
  const narrow = useNarrow()
  const { confirm, dialog } = useConfirm()

  const onImages = useCallback(
    (images: HTMLImageElement[], files: File[]) => {
      shots.add(
        images,
        files.map((file) => file.name.replace(/\.[a-z0-9]+$/i, '')),
      )
      setScreen('edit')
    },
    [shots],
  )

  const input = useImageInput(onImages)

  const styles = useStyleActions(
    library,
    settings,
    setSettings,
    useCallback(() => setScreen('styles'), []),
  )
  const { activeStyle, watermarkImage } = styles

  /* --- Scène ------------------------------------------------------------ */

  const { scene, output } = useScene({
    shots: shots.shots,
    activeShot: shots.activeShot,
    selection: shots.selection,
    settings,
    composition,
    scale,
    backgroundImage: doc.backgroundImage,
    activeStyle,
    watermarkImage,
  })

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

  // Les combinaisons à modificateur partent sur `window` ; les touches nues
  // reviennent ici sous forme de handler, à poser sur le canvas.
  const onCanvasKeys = useShortcuts(
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
      doc.setBackgroundImage(image)
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
      // Une entrée d'historique a pu être écrite par une version antérieure de
      // l'app : un réglage ajouté depuis y manque, et l'`undefined` ressort en
      // `rgba(NaN, …)` au rendu. IndexedDB est une frontière, comme un import.
      setSettings(parseSettings(entry.settings))
      setScreen('edit')
    },
    [library.history, shots],
  )

  /* --- Batch ------------------------------------------------------------ */

  const startBatch = useCallback(() => {
    if (!scene) return
    const picked = shots.shots.filter((shot) => shots.selection.includes(shot.id))
    const jobs = buildBatchJobs(scene, picked, batchRatios, scale, activeStyle?.palette, harmonize)
    void batch.start(
      jobs,
      picked.map((shot) => shot.id),
    )
  }, [scene, shots.shots, shots.selection, batchRatios, scale, activeStyle, harmonize, batch])

  /* --- Nouvelle session ------------------------------------------------- */

  /**
   * Repartir de zéro sans recharger la page. La bibliothèque — styles et
   * historique persistés — survit : c'est justement ce qu'on veut retrouver au
   * projet suivant.
   */
  const newSession = useCallback(async () => {
    // L'image de fond importée n'est pas dans le snapshot d'annulation : un ⌘Z
    // ne la rendrait pas. D'où la confirmation.
    if (
      shots.shots.length > 0 &&
      !(await confirm({
        title: 'Start a new session?',
        body: 'The current shots and settings are cleared. Saved styles and history are kept.',
        action: 'Start over',
      }))
    ) {
      return
    }

    shots.reset()
    batch.reset()
    doc.reset()
    setBatchRatios(['16:9'])
    setScreen('edit')
    setFailure(null)
  }, [shots, batch, doc, confirm])

  /* --- Rendu ------------------------------------------------------------ */

  const styleScreen = useStyleScreen({
    styles,
    library,
    activeShot: shots.activeShot,
    confirm,
    patch,
    onEdit: () => setScreen('edit'),
    onPickWatermark: () => pick('watermark'),
  })

  const empty = shots.shots.length === 0
  const problem = failure ?? exporter.error ?? library.error ?? batch.error

  return (
    <div className="stage-glow relative h-full" {...input.dropHandlers}>
      <TopBar
        screen={screen}
        showNav={!empty}
        onScreen={setScreen}
        onHome={() => void newSession()}
      />

      <main>
        {empty && screen === 'edit' ? (
          <ImportScreen
            dragging={input.dragging}
            error={input.error}
            hasLastStyle={Boolean(library.activeStyleId)}
            recents={library.history.slice(0, 4)}
            onPick={() => pick('shot')}
            onUseLastStyle={() => library.activeStyleId && styles.apply(library.activeStyleId)}
            onOpenRecent={(id) => void reopen(id)}
          />
        ) : screen === 'batch' ? (
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
            harmonize={harmonize}
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
            onHarmonize={setHarmonize}
            onAddShot={() => pick('shot')}
            onChangeStyle={() => setScreen('styles')}
            running={batch.running}
            filesOut={shots.selection.length * batchRatios.length}
            onCancel={batch.cancel}
            onExportAll={startBatch}
            narrow={narrow}
          />
        ) : screen === 'edit' && scene ? (
          <EditorScreen
            scene={scene}
            shots={shots.shots}
            activeShotId={shots.activeShotId}
            selection={shots.selection}
            styles={library.styles}
            activeStyleId={library.activeStyleId}
            selectedLayerIds={shots.selectedLayerIds}
            narrow={narrow}
            output={output}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            copied={exporter.copied}
            onUndo={history.undo}
            onRedo={history.redo}
            onNewSession={() => void newSession()}
            onCopy={onCopy}
            onExport={onExport}
            onKeys={onCanvasKeys}
            onChange={patch}
            onCompose={compose}
            onSelectShot={shots.select}
            onReorderShots={shots.reorder}
            onAddShot={() => pick('shot')}
            onApplyStyle={styles.apply}
            onSaveStyle={styles.save}
            onUpdateStyle={styles.update}
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
        ) : screen === 'styles' ? (
          <StylesScreen
            styles={library.styles}
            activeId={library.activeStyleId}
            preview={scene}
            shots={shots.shots}
            sampled={shots.activeShot?.palette ?? null}
            {...styleScreen}
            onImport={() => pick('style')}
            onExportStyle={exportStyle}
            onSaveStyle={styles.save}
            narrow={narrow}
          />
        ) : (
          <HistoryScreen
            entries={library.history}
            styles={library.styles}
            bytes={library.bytes}
            onOpen={(id) => void reopen(id)}
            onAdd={() => pick('shot')}
            onPurge={() =>
              // Une purge ne se rattrape pas : l'historique est le seul
              // exemplaire, et l'écran vient de le dire.
              void confirm({
                title: 'Delete the oldest exports?',
                body: 'They cannot be recovered — there is no copy anywhere else.',
                action: 'Delete',
                tone: 'danger',
              }).then((ok) => {
                if (ok) void library.purge()
              })
            }
            narrow={narrow}
          />
        )}
      </main>

      {/* Les deux régions sont montées en permanence, vides comprises : une
          région insérée au moment de l'annonce n'est pas lue de façon fiable. */}
      <div role="alert" className="absolute right-5 bottom-5 z-30">
        {problem && <ErrorNote>{problem}</ErrorNote>}
      </div>
      <p role="status" className="absolute right-5 bottom-5 z-30 font-mono text-[10px] text-dim">
        {!problem && (exporter.copied ? 'Copied to clipboard' : (exporter.status ?? ''))}
      </p>

      {/* Un seul dialogue de confirmation pour toute l'app. */}
      {dialog}

      {/* Déclenchés par un bouton : les laisser dans l'ordre de tabulation
          n'offrirait qu'un focus invisible sur 1 px. */}
      <input
        ref={input.inputRef}
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        onChange={input.onInputChange}
        className="sr-only"
        aria-label="Choose one or more screenshots"
      />
      <input
        ref={side.inputRef}
        type="file"
        accept="image/*,application/json,.json"
        tabIndex={-1}
        onChange={side.onChange}
        className="sr-only"
        aria-label="Choose a file"
      />
    </div>
  )
}
