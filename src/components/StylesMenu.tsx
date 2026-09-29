import { useEffect, useRef } from 'react'
import Menu from './Menu.tsx'
import { AddIcon, ExpandedIcon, JsonIcon, PickFileIcon, StylesIcon, UpdateStyleIcon } from './icons.tsx'
import { Button, MonoLabel, Row, buttonClass } from './ui.tsx'
import { BASE_WIDTH, renderScene } from '../lib/render.ts'
import type { Scene, Style } from '../types.ts'

/** Largeur de la miniature, en pixels CSS. */
const THUMB = 56

/**
 * Le style appliqué à l'image en cours, en petit — par `renderScene`, comme
 * tout le reste : une miniature qui ne passerait pas par le moteur mentirait
 * sur le rendu.
 */
function StyleThumb({ scene, style }: { scene: Scene; style: Style }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const thumb: Scene = {
      shots: scene.shots.slice(0, 1),
      palette: style.palette ?? scene.palette,
      settings: style.settings,
      composition: { ...scene.composition, layout: 'single' },
      backgroundImage: scene.backgroundImage,
    }
    try {
      renderScene(ctx, thumb, (THUMB * devicePixelRatio) / BASE_WIDTH)
    } catch (error) {
      // Un fond `image` sans image chargée : la case reste vide, le style marche.
      console.warn('[styles] miniature impossible', style.name, error)
    }
  }, [scene, style])

  return <canvas ref={ref} aria-hidden className="w-14 shrink-0 rounded-xs bg-sunken" />
}

type StylesMenuProps = {
  styles: readonly Style[]
  active: Style | null
  /** La scène en cours, pour les miniatures. */
  scene: Scene
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
  scene,
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
                  <StyleThumb scene={scene} style={style} />
                  <span className="t-ui truncate">{style.name}</span>
                </Row>
              ))}
            </div>
          )}

          <div className="grid gap-1.5 border-t border-hairline pt-3">
            {active && (
              <Button onClick={onUpdate} className="justify-start">
                <UpdateStyleIcon />
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
