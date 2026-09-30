import { useCallback, useEffect, useState } from 'react'
import { useConfirm } from './components/ConfirmDialog.tsx'
import EditorScreen from './components/EditorScreen.tsx'
import ExportMenu from './components/ExportMenu.tsx'
import HistoryDrawer from './components/HistoryDrawer.tsx'
import { HistoryIcon } from './components/icons.tsx'
import ImportScreen from './components/ImportScreen.tsx'
import { useShortcutsPanel } from './components/ShortcutsDialog.tsx'
import StyleSection from './components/StyleSection.tsx'
import StylesMenu from './components/StylesMenu.tsx'
import TopBar from './components/TopBar.tsx'
import { Button, ErrorNote } from './components/ui.tsx'
import { useBatch } from './hooks/useBatch.ts'
import { useDocument } from './hooks/useDocument.ts'
import { useBatchExport } from './hooks/useBatchExport.ts'
import { useExport } from './hooks/useExport.ts'
import { useImageInput } from './hooks/useImageInput.ts'
import { useDocumentHistory } from './hooks/useHistory.ts'
import { useLayerActions } from './hooks/useLayerActions.ts'
import { useLibrary } from './hooks/useLibrary.ts'
import { useOutputMode } from './hooks/useOutputMode.ts'
import { useScene } from './hooks/useScene.ts'
import { useStyleActions } from './hooks/useStyleActions.ts'
import { useStyleEditing } from './hooks/useStyleEditing.ts'
import { useWallpaper } from './hooks/useWallpaper.ts'
import { useAnchoredSettings } from './hooks/useAnchoredSettings.ts'
import { useShots } from './hooks/useShots.ts'
import { useSideFile, type SideTarget } from './hooks/useSideFile.ts'
import { useNarrow, useShortcuts } from './hooks/useShortcuts.ts'
import { loadImage } from './lib/image.ts'
import { getHistoryBlobs } from './lib/store.ts'
import { exportStyle, parseSettings } from './lib/styles.ts'
import { isWallpaper } from './lib/wallpapers.ts'

/** Ce qu'un `<input type=file>` sert à choisir, selon le bouton cliqué. */
type PickTarget = 'shot' | SideTarget

export default function App() {
  const [failure, setFailure] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  /** Accusé de réception bref, dans la ligne d'état : enregistrer un style ne
   *  change presque rien à l'écran, il faut le dire. */
  const [note, setNote] = useState<string | null>(null)
  /** Une écriture refusée se dit : la note seule mentirait. */
  const fail = (fallback: string) => (cause: unknown) =>
    setFailure(cause instanceof Error ? cause.message : fallback)
  useEffect(() => {
    if (!note) return
    const timer = setTimeout(() => setNote(null), 2400)
    return () => clearTimeout(timer)
  }, [note])

  const doc = useDocument()
  const { settings, setSettings, composition, setComposition, scale, setScale, patch, compose } = doc

  const shots = useShots()
  const library = useLibrary()
  const batch = useBatch()
  const narrow = useNarrow()
  const { confirm, dialog } = useConfirm()
  const help = useShortcutsPanel()
  const onImages = useCallback(
    (images: HTMLImageElement[], files: File[]) =>
      shots.add(
        images,
        files.map((file) => file.name.replace(/\.[a-z0-9]+$/i, '')),
      ),
    [shots],
  )

  const input = useImageInput(onImages)
  const anchored = useAnchoredSettings(shots, settings, composition, patch, setSettings, compose)
  const { retune, restyle } = anchored
  const output = useOutputMode(composition, anchored.recompose, shots)
  const styles = useStyleActions(library, settings, restyle)
  const { activeStyle, watermarkImage } = styles

  /* --- Scène ------------------------------------------------------------ */

  const wallpaper = useWallpaper(settings.background, 'full', setFailure)

  const { scene, output: size } = useScene({
    shots: shots.shots,
    activeShot: shots.activeShot,
    selection: shots.selection,
    settings,
    composition,
    scale,
    // Un fond macOS prend la place de l'image perso, jamais l'inverse : pendant
    // qu'il charge, c'est l'aplat qui doit se voir, pas l'image d'avant.
    backgroundImage: isWallpaper(settings.background) ? wallpaper : doc.backgroundImage,
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

  const batchExport = useBatchExport({
    scene,
    shots: shots.shots,
    scale,
    ratio: settings.ratio,
    batch,
    library,
    onError: setFailure,
  })

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
      onHelp: help.open,
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

  const styleEditing = useStyleEditing({
    styles,
    library,
    confirm,
    onPickWatermark: () => pick('watermark'),
  })

  /* --- Historique ------------------------------------------------------- */

  const reopen = useCallback(
    async (id: string) => {
      const entry = library.history.find((item) => item.id === id)
      // Rouvrir remplace la session : même garde que « New session ».
      const replacing = shots.shots.length > 0
      if (
        replacing &&
        !(await confirm({
          title: 'Replace the current images?',
          body: 'Reopening this export closes the images and layers you are working on.',
          action: 'Reopen',
        }))
      )
        return
      try {
        const blobs = await getHistoryBlobs(id)
        if (!entry || !blobs) throw new Error('This export is no longer in the history')
        shots.replaceAll([await loadImage(blobs.source)], [entry.name])
        batch.reset()
      } catch (cause: unknown) {
        setFailure(cause instanceof Error ? cause.message : 'Could not reopen this export')
        return
      }
      // Une entrée d'historique a pu être écrite par une version antérieure de
      // l'app : un réglage ajouté depuis y manque, et l'`undefined` ressort en
      // `rgba(NaN, …)` au rendu. IndexedDB est une frontière, comme un import.
      setSettings(parseSettings(entry.settings))
    },
    [library.history, shots, setSettings, confirm, batch],
  )

  const purge = () =>
    // Une purge ne se rattrape pas : l'historique est le seul exemplaire.
    void confirm({
      title: 'Delete the oldest exports?',
      body: 'They cannot be recovered — there is no copy anywhere else.',
      action: 'Delete',
      tone: 'danger',
    }).then((ok) => {
      if (ok) void library.purge()
    })

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
    batchExport.reset()
    setFailure(null)
  }, [shots, batch, doc, confirm])

  /* --- Rendu ------------------------------------------------------------ */

  const empty = shots.shots.length === 0
  const problem = failure ?? exporter.error ?? library.error ?? batch.error
  const separateBatch = output.mode === 'separate' && shots.shots.length > 1

  const actions = (
    <>
      {scene && (
        <StylesMenu
          styles={library.styles}
          active={activeStyle}
          scene={scene}
          onApply={styles.apply}
          onSave={() =>
            void styles
              .save()
              .then(() => setNote('Style saved — name it under Style in the inspector'), fail('Could not save the style'))
          }
          onUpdate={() =>
            void styles.update().then(() => setNote(`“${activeStyle?.name}” updated`), fail('Could not update the style'))
          }
          onImport={() => pick('style')}
          onExport={exportStyle}
        />
      )}
      <Button variant="ghost" onClick={() => setHistoryOpen(true)} title="History" aria-label="History">
        <HistoryIcon />
        <span className="max-[1180px]:hidden">History</span>
      </Button>
      {!empty && (
        <ExportMenu
          scale={scale}
          format={settings.format}
          output={size}
          copied={exporter.copied}
          onScale={setScale}
          onFormat={(format) => patch({ format })}
          onExport={onExport}
          onCopy={onCopy}
          batch={separateBatch ? { ...batchExport.controls, count: shots.shots.length } : null}
        />
      )}
    </>
  )

  return (
    <div className="stage-grain relative h-full" {...input.dropHandlers}>
      <TopBar actions={actions} onHelp={help.open} />

      <main>
        {empty ? (
          <ImportScreen
            dragging={input.dragging}
            error={input.error}
            lastStyle={library.styles.find((style) => style.id === library.lastStyleId)?.name ?? null}
            lastStyleArmed={Boolean(activeStyle) && activeStyle?.id === library.lastStyleId}
            recents={library.history.slice(0, 4)}
            onPick={() => pick('shot')}
            onUseLastStyle={() => library.lastStyleId && styles.apply(library.lastStyleId)}
            onOpenRecent={(id) => void reopen(id)}
          />
        ) : (
          scene && (
            <EditorScreen
              scene={scene}
              shots={shots.shots}
              activeShotId={shots.activeShotId}
              members={shots.selection}
              mode={output.mode}
              queue={batch.queue}
              selectedLayerIds={shots.selectedLayerIds}
              style={
                activeStyle && (
                  <StyleSection
                    style={activeStyle}
                    editing={styleEditing}
                  />
                )
              }
              narrow={narrow}
              output={size}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
              onUndo={history.undo}
              onRedo={history.redo}
              onNewSession={() => void newSession()}
              onKeys={onCanvasKeys}
              onChange={retune}
              onCompose={anchored.recompose}
              onPlace={shots.place}
              onPan={shots.pan}
              onMode={output.setMode}
              onActivate={shots.activate}
              onToggleMember={anchored.toggleMember}
              onReorderShots={anchored.reorder}
              onAddShot={() => pick('shot')}
              onPickBackgroundImage={() => pick('background')}
              onCreateAnnotation={shots.createAnnotation}
              onPatchAnnotation={shots.patchAnnotation}
              onPatchNode={shots.patchNode}
              onTranslateLayers={shots.translateLayers}
              onDuplicateLayers={shots.duplicateLayers}
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
          )
        )}
      </main>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entries={library.history}
        styles={library.styles}
        bytes={library.bytes}
        onOpen={(id) => void reopen(id)}
        onPurge={purge}
      />

      {/* Les deux régions sont montées en permanence, vides comprises : une
          région insérée au moment de l'annonce n'est pas lue de façon fiable. */}
      <div role="alert" className="absolute bottom-[128px] left-1/2 z-30 -translate-x-1/2">
        {problem && <ErrorNote>{problem}</ErrorNote>}
      </div>
      <p
        role="status"
        className="absolute bottom-[128px] left-1/2 z-30 -translate-x-1/2 font-mono text-[10px] whitespace-nowrap text-dim"
      >
        {!problem && (note ?? (exporter.copied ? 'Copied to clipboard' : (exporter.status ?? '')))}
      </p>

      {/* Un seul dialogue de confirmation pour toute l'app. */}
      {dialog}
      {help.dialog}

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
