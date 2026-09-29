import Menu from './Menu.tsx'
import { AddIcon, ExpandedIcon, JsonIcon, PickFileIcon, SaveStyleIcon, StylesIcon } from './icons.tsx'
import { Button, MonoLabel, Row, buttonClass } from './ui.tsx'
import type { Style } from '../types.ts'

type StylesMenuProps = {
  styles: readonly Style[]
  active: Style | null
  onApply: (id: string) => void
  onSave: () => void
  onUpdate: () => void
  onImport: () => void
  onExport: (style: Style) => void
}

/**
 * Les styles, en menu : appliquer, enregistrer, mettre à jour, partager par
 * `.json`. Ce qui règle un style au-delà de ses réglages — nom, filigrane,
 * palette figée — vit dans la section « Style » de l'inspecteur, là où on voit
 * l'effet.
 */
export default function StylesMenu({
  styles,
  active,
  onApply,
  onSave,
  onUpdate,
  onImport,
  onExport,
}: StylesMenuProps) {
  return (
    <Menu
      label="Styles"
      trigger={
        <>
          <StylesIcon />
          <span className="max-w-32 truncate">{active ? active.name : 'Styles'}</span>
          <ExpandedIcon className="size-3.5" />
        </>
      }
      triggerClassName={buttonClass('ghost')}
      className="w-72 space-y-3"
    >
      {(close) => (
        <>
          <MonoLabel>Saved — {styles.length}</MonoLabel>
          {styles.length === 0 ? (
            <p className="t-ui-small text-dim">
              A style keeps every setting of the frame and background, to reuse on the next shot.
            </p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {styles.map((style) => (
                <Row
                  key={style.id}
                  active={style.id === active?.id}
                  onClick={() => {
                    onApply(style.id)
                    close()
                  }}
                >
                  <span className="t-ui truncate">{style.name}</span>
                </Row>
              ))}
            </div>
          )}

          <div className="grid gap-1.5 border-t border-hairline pt-3">
            {active && (
              <Button onClick={onUpdate} className="justify-start">
                <SaveStyleIcon />
                <span className="truncate">Update “{active.name}”</span>
              </Button>
            )}
            <Button onClick={onSave} className="justify-start">
              <AddIcon />
              Save as a new style
            </Button>
            <div className="flex gap-1.5">
              <Button variant="ghost" onClick={onImport} className="flex-1 justify-center">
                <PickFileIcon />
                Import
              </Button>
              <Button
                variant="ghost"
                onClick={() => active && onExport(active)}
                disabled={!active}
                className="flex-1 justify-center"
                title={active ? `Export “${active.name}” as .json` : 'Apply a style to export it'}
              >
                <JsonIcon />
                Export
              </Button>
            </div>
          </div>
        </>
      )}
    </Menu>
  )
}
