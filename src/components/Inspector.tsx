import DocumentSections, { type DocumentSectionsProps } from './DocumentSections.tsx'
import LayerInspector, { type LayerInspectorProps } from './LayerInspector.tsx'
import { BackIcon } from './icons.tsx'
import { Button, Panel } from './ui.tsx'
import type { ReactNode } from 'react'

type InspectorProps = {
  /** Présent ⇒ au moins un calque est sélectionné : l'inspecteur ne parle
   *  alors que de lui. */
  layer: LayerInspectorProps | null
  document: DocumentSectionsProps
  /** La section « Style », quand un style est appliqué. */
  style?: ReactNode
  /** Retour aux réglages du document — l'équivalent d'`Escape`. */
  onDeselect: () => void
  /** Descendu sous le bouton de la feuille rétractable, en mode étroit. */
  offset?: boolean
}

/**
 * L'inspecteur, contextuel : ce qui est sélectionné, et seulement ça. Un calque
 * sélectionné montre ses réglages en tête, sans rien à faire défiler ; rien de
 * sélectionné montre le document. Les deux ne s'empilent plus : on sait
 * toujours ce qu'on règle.
 */
export default function Inspector({ layer, document, style, onDeselect, offset = false }: InspectorProps) {
  return (
    <Panel
      className={`absolute right-5 z-10 max-h-[calc(100%-32px)] w-72 space-y-4 overflow-y-auto p-4 ${offset ? 'top-[64px]' : 'top-4'}`}
    >
      {layer ? (
        <>
          <Button variant="ghost" onClick={onDeselect} className="-mx-2 -mt-1 px-2" title="Back to the document (Escape)">
            <BackIcon />
            Document
          </Button>
          <LayerInspector {...layer} />
        </>
      ) : (
        <>
          <DocumentSections {...document} />
          {style}
        </>
      )}
    </Panel>
  )
}
