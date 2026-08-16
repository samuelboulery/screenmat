import type { Mode, View } from './TopBar.tsx'
import { Button } from './ui.tsx'
import { humanSize } from '../lib/export.ts'
import type { Format, Style } from '../types.ts'

type TopBarActionsProps = {
  view: View
  mode: Mode
  /** Aucun screenshot chargé : l'écran d'import n'a pas d'action de barre. */
  empty: boolean
  /** Dimensions de sortie, déjà multipliées par l'échelle. */
  output: { width: number; height: number; format: Format } | null
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

const META = 'font-mono text-[11px] text-[#6F7386]'

/** Ce que la barre haute affiche à droite, selon l'écran courant. */
export default function TopBarActions(props: TopBarActionsProps) {
  const { view, mode, empty } = props
  const editing = !empty && view === 'editor'

  if (editing && mode !== 'batch' && props.output) {
    return (
      <>
        <span className={META}>
          {props.output.width} × {props.output.height} · {props.output.format}
        </span>
        <Button onClick={props.onCopy}>{props.copied ? 'Copied' : 'Copy'}</Button>
        <Button variant="primary" onClick={props.onExport}>
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
          Cancel
        </Button>
        <Button variant="primary" onClick={props.onExportBatch} disabled={props.batchRunning}>
          Export all
        </Button>
      </>
    )
  }

  if (view === 'styles' && props.activeStyle) {
    const style = props.activeStyle
    return (
      <>
        <Button onClick={() => props.onExportStyle(style)}>Export .json</Button>
        <Button variant="primary" onClick={props.onSaveStyle}>
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
        <Button onClick={props.onNewShot}>New shot</Button>
      </>
    )
  }

  return null
}
