import { useConfirm } from '../components/ConfirmDialog.tsx'
import type { useLibrary } from './useLibrary.ts'
import type { useStyleActions } from './useStyleActions.ts'
import type { WatermarkPosition } from '../types.ts'

type StyleEditingInput = {
  styles: ReturnType<typeof useStyleActions>
  library: ReturnType<typeof useLibrary>
  confirm: ReturnType<typeof useConfirm>['confirm']
  onPickWatermark: () => void
}

/**
 * Les gestes de la section « Style » de l'inspecteur. Ils vivent ici parce
 * qu'ils sont presque tous la même chose — recopier le style actif avec un
 * champ changé — et qu'alignés dans le JSX ils noieraient la mise en page.
 */
export function useStyleEditing(input: StyleEditingInput) {
  const { styles, library, confirm, onPickWatermark } = input
  const { activeStyle } = styles

  return {
    onRename: (id: string, name: string) => {
      const style = library.styles.find((item) => item.id === id)
      if (style) styles.patch({ ...style, name })
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
