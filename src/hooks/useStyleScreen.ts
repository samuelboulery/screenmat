import { useConfirm } from '../components/ConfirmDialog.tsx'
import { withAccent, withColor, withoutAccent } from '../lib/styles.ts'
import type { useLibrary } from './useLibrary.ts'
import type { useStyleActions } from './useStyleActions.ts'
import type { Palette, Settings, Shot, WatermarkPosition } from '../types.ts'

type StyleScreenInput = {
  styles: ReturnType<typeof useStyleActions>
  library: ReturnType<typeof useLibrary>
  activeShot: Shot | null
  confirm: ReturnType<typeof useConfirm>['confirm']
  /** Pousse aussi le réglage dans l'éditeur : le style affiché au centre est
   *  toujours le style appliqué, et l'aperçu de droite doit le refléter sans
   *  second chemin de rendu. */
  patch: (next: Partial<Settings>) => void
  onEdit: () => void
  onPickWatermark: () => void
}

/**
 * Les gestes de l'écran Styles. Ils vivent ici parce qu'ils sont presque tous
 * la même chose — recopier le style actif avec un champ changé — et qu'alignés
 * dans le JSX d'`App` ils noyaient le routage sous soixante lignes.
 */
export function useStyleScreen(input: StyleScreenInput) {
  const { styles, library, activeShot, confirm, patch, onEdit, onPickWatermark } = input
  const { activeStyle } = styles

  /** Éditer une couleur d'une palette encore échantillonnée la fige dans le
   *  style : une palette qui se recalcule à chaque screenshot n'est pas
   *  éditable, et le toggle « Override » ne fait que refléter sa présence. */
  const editPalette = (change: (palette: Palette) => Palette) => {
    const current = activeStyle?.palette ?? activeShot?.palette
    if (!activeStyle || !current) return
    styles.patch({ ...activeStyle, palette: change(current) })
  }

  return {
    onSelect: styles.apply,

    onRename: (id: string, name: string) => {
      const style = library.styles.find((item) => item.id === id)
      if (style) styles.patch({ ...style, name })
    },

    onPatchSettings: (next: Partial<Settings>) => {
      if (!activeStyle) return
      styles.patch({ ...activeStyle, settings: { ...activeStyle.settings, ...next } })
      patch(next)
    },

    onPatchWatermark: (position: WatermarkPosition) => {
      if (activeStyle?.watermark) {
        styles.patch({ ...activeStyle, watermark: { ...activeStyle.watermark, position } })
      }
    },

    onPickWatermark,

    onRemoveWatermark: () => {
      if (!activeStyle) return
      // Retirer la clé plutôt que d'y poser `undefined` : c'est un style sans
      // filigrane qu'on persiste, pas un filigrane vide.
      const { watermark: _dropped, ...rest } = activeStyle
      styles.patch(rest)
    },

    onOverridePalette: (override: boolean) => {
      if (!activeStyle) return
      styles.patch({
        ...activeStyle,
        palette: override ? (activeShot?.palette ?? undefined) : undefined,
      })
    },

    onPatchColor: (index: number, color: string) =>
      editPalette((palette) => withColor(palette, index, color)),
    onAddColor: (color: string) => editPalette((palette) => withAccent(palette, color)),
    onRemoveColor: (index: number) => editPalette((palette) => withoutAccent(palette, index)),

    onEditInEditor: (id: string) => {
      styles.apply(id)
      onEdit()
    },

    onDelete: (id: string) => {
      // Un style supprimé n'est pas dans la pile d'annulation : on confirme,
      // comme pour la purge de l'historique.
      void confirm({
        title: 'Delete this style?',
        body: 'This cannot be undone.',
        action: 'Delete',
        tone: 'danger',
      }).then((ok) => {
        if (ok) void library.removeStyle(id)
      })
    },
  }
}
