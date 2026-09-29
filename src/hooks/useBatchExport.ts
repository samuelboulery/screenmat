import { useCallback, useState } from 'react'
import { archive } from './useExport.ts'
import type { useBatch } from './useBatch.ts'
import type { useLibrary } from './useLibrary.ts'
import type { BatchControls } from '../components/ExportMenu.tsx'
import { buildBatchJobs } from '../lib/export.ts'
import type { Palette, Ratio, Scene, Shot } from '../types.ts'

type BatchExportInput = {
  scene: Scene | null
  shots: readonly Shot[]
  scale: number
  /** Le ratio de l'éditeur, point de départ du lot. */
  ratio: Ratio
  palette: Palette | undefined
  batch: ReturnType<typeof useBatch>
  library: ReturnType<typeof useLibrary>
  onError: (message: string) => void
}

/**
 * Le lot du mode séparé : toutes les images, une par fichier et par ratio, dans
 * un zip. Porte les ratios cochés et l'harmonisation des fonds ; rend ce que le
 * menu Export affiche.
 */
export function useBatchExport({ scene, shots, scale, ratio, palette, batch, library, onError }: BatchExportInput) {
  /** `null` ⇒ celui de l'éditeur : ouvrir le menu d'export ne doit pas changer
   *  le cadrage de ce qu'on vient de régler. `auto` n'a pas de case dans le
   *  menu, il n'entre donc jamais dans le lot. */
  const [picked, setPicked] = useState<Ratio[] | null>(null)
  const [harmonize, setHarmonize] = useState(false)
  const ratios = picked ?? [ratio === 'auto' ? '4:3' : ratio]

  /** Chaque image entre une fois dans l'historique, à son premier ratio :
   *  N images × R ratios rempliraient IndexedDB de variantes d'un même réglage. */
  const exportAll = useCallback(() => {
    if (!scene) return
    const jobs = buildBatchJobs(scene, shots, ratios, scale, palette, harmonize)
    const styleId = library.activeStyleId
    void batch.start(
      jobs,
      shots.map((shot) => shot.id),
      (job, blob) =>
        job.scene.settings.ratio === ratios[0] &&
        void archive(job.scene, job.scale, blob, styleId, library.addHistory).catch((cause: unknown) =>
          onError(cause instanceof Error ? cause.message : 'Could not save the export to history'),
        ),
    )
  }, [scene, shots, ratios, scale, palette, harmonize, batch, library, onError])

  const controls: BatchControls = {
    running: batch.running,
    rendered: batch.rendered,
    total: batch.total,
    ratios,
    harmonize,
    onToggleRatio: (next) =>
      setPicked(ratios.includes(next) ? ratios.filter((item) => item !== next) : [...ratios, next]),
    onHarmonize: setHarmonize,
    onExportAll: exportAll,
    onCancel: batch.cancel,
  }

  return { controls, reset: () => setPicked(null) }
}
