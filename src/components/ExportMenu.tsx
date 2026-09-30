import Menu from './Menu.tsx'
import { CancelIcon, CopiedIcon, CopyIcon, ExpandedIcon, ExportAllIcon, ExportIcon } from './icons.tsx'
import { Button, CheckBox, Row, Section, Segmented, buttonClass } from './ui.tsx'
import type { Format, Ratio } from '../types.ts'
import { MAC, keyLabel } from '../lib/keys.ts'

/** Les échelles d'export, en toutes lettres : `useShortcuts` pose les mêmes
 *  sur 1/2/3, et les deux doivent dire la même chose. */
const SCALES = [
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
  { value: '3', label: '3×' },
] as const

const FORMATS: ReadonlyArray<{ value: Format; label: string }> = [
  { value: 'webp', label: 'WebP' },
  { value: 'png', label: 'PNG' },
]

/** Les ratios qu'un lot peut sortir en plus — `auto` n'y a pas de sens : il
 *  n'impose rien, il suit chaque image. */
const RATIOS: Ratio[] = ['4:3', '1:1', '16:9', '9:16']

export type BatchControls = {
  running: boolean
  rendered: number
  total: number
  ratios: readonly Ratio[]
  harmonize: boolean
  onToggleRatio: (ratio: Ratio) => void
  onHarmonize: (on: boolean) => void
  onExportAll: () => void
  onCancel: () => void
}

type ExportMenuProps = {
  scale: number
  format: Format
  /** Dimensions de sortie, déjà multipliées par l'échelle. */
  output: { width: number; height: number } | null
  copied: boolean
  onScale: (scale: number) => void
  onFormat: (format: Format) => void
  onExport: () => void
  onCopy: () => void
  /** Présent ⇒ plusieurs images en mode séparé : le lot devient possible. */
  batch: (BatchControls & { count: number }) | null
}

/**
 * L'export, en haut à droite : un bouton qui sort l'image courante à l'échelle
 * affichée, et un menu pour tout le reste — format, échelle, copie, et le lot
 * zippé quand il y a plusieurs images. Format et échelle restent atteignables à
 * toute largeur d'écran : ils ne dépendent plus d'une barre qui se replie.
 */
export default function ExportMenu(props: ExportMenuProps) {
  const { scale, format, output, copied, batch } = props

  return (
    <div className="flex items-stretch">
      <Button
        variant="primary"
        onClick={props.onExport}
        title={keyLabel('Export this image (⌘E)', MAC)}
        aria-label={keyLabel(`Export this image at ${scale}× (⌘E)`, MAC)}
        className="rounded-r-none"
      >
        <ExportIcon />
        {batch?.running ? `${batch.rendered} / ${batch.total}` : `Export ${scale}×`}
      </Button>
      <Menu
        label="Export options"
        trigger={<ExpandedIcon />}
        triggerClassName={buttonClass('primary', 'rounded-l-none border-l border-stage/25 px-2')}
        className="w-72 space-y-4"
      >
        {(close) => (
          <>
            <Section title="Output">
              <Segmented className="w-full" options={FORMATS} value={format} onPick={props.onFormat} />
              <Segmented
                className="w-full"
                options={SCALES}
                value={String(scale)}
                onPick={(value) => props.onScale(Number(value))}
              />
              {output && (
                <p className="t-mono-micro text-dim">
                  {output.width} × {output.height} · {format}
                </p>
              )}
              <Button
                onClick={() => {
                  props.onCopy()
                  close()
                }}
                className="w-full justify-center"
                title={keyLabel('Copy (⌘C)', MAC)}
              >
                {copied ? <CopiedIcon /> : <CopyIcon />}
                {copied ? 'Copied' : 'Copy to clipboard'}
              </Button>
            </Section>

            {batch && <BatchSection {...batch} />}
          </>
        )}
      </Menu>
    </div>
  )
}

/** Toutes les images d'un coup, dans un zip — l'ancien écran Batch. */
function BatchSection(batch: BatchControls & { count: number }) {
  const files = batch.count * batch.ratios.length

  return (
    <Section title={`All ${batch.count} images`}>
      <div className="grid grid-cols-4 gap-1">
        {RATIOS.map((ratio) => (
          <Row
            key={ratio}
            active={batch.ratios.includes(ratio)}
            onClick={() => batch.onToggleRatio(ratio)}
            className="justify-center px-1 py-1.5 font-mono text-[10px]"
          >
            {ratio}
          </Row>
        ))}
      </div>
      <Row active={batch.harmonize} onClick={() => batch.onHarmonize(!batch.harmonize)} className="py-2">
        <CheckBox checked={batch.harmonize} />
        <span className="t-ui">Harmonize backgrounds</span>
      </Row>
      <p className="t-mono-micro text-dim">
        Same saturation and contrast across the batch. Each image keeps its own hue.
      </p>
      {batch.running ? (
        <div className="flex items-center gap-2">
          <span className="t-mono-micro flex-1 text-dim" role="status">
            {batch.rendered} / {batch.total} rendered
          </span>
          <Button onClick={batch.onCancel}>
            <CancelIcon />
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="primary"
          onClick={batch.onExportAll}
          disabled={files === 0}
          className="w-full justify-center"
        >
          <ExportAllIcon />
          Export {files} {files === 1 ? 'file' : 'files'} · zip
        </Button>
      )}
    </Section>
  )
}
