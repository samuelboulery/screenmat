import type { Mode, View } from './TopBar.tsx'
import {
  CancelIcon,
  CopiedIcon,
  CopyIcon,
  ExportAllIcon,
  ExportIcon,
  JsonIcon,
  NewShotIcon,
  SaveStyleIcon,
} from './icons.tsx'
import { Button } from './ui.tsx'
import { humanSize } from '../lib/export.ts'
import type { Style } from '../types.ts'

type TopBarActionsProps = {
  view: View
  mode: Mode
  /** Aucun screenshot chargé : l'écran d'import n'a pas d'action de barre. */
  empty: boolean
  copied: boolean
  selected: number
  filesOut: number
  batchRunning: boolean
  activeStyle: Style | null
  exports: number
  bytes: number
  onCopy: () => void
  onExport: () => void
  onCancelBatch: () => void
  onExportBatch: () => void
  onExportStyle: (style: Style) => void
  onSaveStyle: () => void
  onNewShot: () => void
}

/** Métadonnée annexe : elle disparaît avant que la barre ne déborde. */
const META = 'font-mono text-[11px] whitespace-nowrap text-[#6F7386] max-[1180px]:hidden'

/** Ce que la barre haute affiche à droite, selon l'écran courant. */
export default function TopBarActions(props: TopBarActionsProps) {
  const { view, mode, empty } = props
  const editing = !empty && view === 'editor'

  // Dimensions, undo/redo et nouvelle session décrivent le document : ils
  // vivent dans le filmstrip. Ne restent ici que les deux fins de course.
  if (editing && mode !== 'batch') {
    return (
      <>
        <Button onClick={props.onCopy}>
          {props.copied ? <CopiedIcon /> : <CopyIcon />}
          {props.copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="primary" onClick={props.onExport}>
          <ExportIcon />
          Export
        </Button>
      </>
    )
  }

  if (editing && mode === 'batch') {
    return (
      <>
        <span className={META}>
          {props.selected} selected · {props.filesOut} files out
        </span>
        <Button onClick={props.onCancelBatch} disabled={!props.batchRunning}>
          <CancelIcon />
          Cancel
        </Button>
        <Button variant="primary" onClick={props.onExportBatch} disabled={props.batchRunning}>
          <ExportAllIcon />
          Export all
        </Button>
      </>
    )
  }

  if (view === 'styles' && props.activeStyle) {
    const style = props.activeStyle
    return (
      <>
        <Button onClick={() => props.onExportStyle(style)}>
          <JsonIcon />
          Export .json
        </Button>
        <Button variant="primary" onClick={props.onSaveStyle}>
          <SaveStyleIcon />
          Save style
        </Button>
      </>
    )
  }

  if (view === 'history') {
    return (
      <>
        <span className={META}>
          {props.exports} exports · {humanSize(props.bytes)} local
        </span>
        <Button onClick={props.onNewShot}>
          <NewShotIcon />
          New shot
        </Button>
      </>
    )
  }

  return null
}
