import { useEffect, useRef } from 'react'
import Menu from './Menu.tsx'
import { AddIcon, ExpandedIcon, JsonIcon, PickFileIcon, StylesIcon, UpdateStyleIcon } from './icons.tsx'
import { Button, MonoLabel, Row, buttonClass } from './ui.tsx'
import { useWallpaper } from '../hooks/useWallpaper.ts'
import { m } from '../lib/i18n/index.ts'
import { BASE_WIDTH, renderScene } from '../lib/render.ts'
import { isWallpaper } from '../lib/wallpapers.ts'
import type { Scene, Style } from '../types.ts'

/** Largeur de la miniature, en pixels CSS. */
const THUMB = 56

/**
 * Le style appliqué à l'image en cours, en petit — par `renderScene`, comme
 * tout le reste : une miniature qui ne passerait pas par le moteur mentirait
 * sur le rendu.
 */
const warn = (message: string) => console.warn('[styles] vignette de fond impossible', message)

function StyleThumb({ scene, style }: { scene: Scene; style: Style }) {
  const ref = useRef<HTMLCanvasElement>(null)

  // Ce qui change la miniature, et rien d'autre : un calque déplacé ne la
  // redessine pas, et elle ne montre pas les calques.
  const shot = scene.shots[0]
  const { palette, composition } = scene
  // Le fond macOS du style, pas celui de la scène en cours : sa vignette suffit
  // à une miniature de 56 px.
  const wallpaper = useWallpaper(style.settings.background, 'thumb', warn)
  // Quand la scène porte un fond macOS, son image n'est pas l'image perso : un
  // style au fond `image` n'a alors rien à montrer, plutôt que le mauvais fond.
  const backgroundImage = isWallpaper(style.settings.background)
    ? (wallpaper ?? undefined)
    : isWallpaper(scene.settings.background)
      ? undefined
      : scene.backgroundImage

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx || !shot) return
    const thumb: Scene = {
      shots: [{ ...shot, layers: [] }],
      palette,
      settings: style.settings,
      composition: { ...composition, layout: 'single' },
      backgroundImage,
    }
    try {
      renderScene(ctx, thumb, (THUMB * devicePixelRatio) / BASE_WIDTH)
    } catch (error) {
      // Un fond `image` sans image chargée : la case reste vide, le style marche.
      console.warn('[styles] miniature impossible', style.name, error)
    }
  }, [shot?.image, palette, composition, backgroundImage, style])

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
      label={m.workspace.styles.title}
      trigger={
        <>
          <StylesIcon />
          <span className="max-w-32 truncate">{active ? active.name : m.workspace.styles.title}</span>
          <ExpandedIcon className="size-3.5" />
        </>
      }
      triggerClassName={buttonClass('ghost')}
      className="w-72 space-y-3"
    >
      {(close) => (
        <>
          <MonoLabel>{m.workspace.styles.saved(styles.length)}</MonoLabel>
          {styles.length === 0 ? (
            <p className="t-ui-small text-dim">{m.workspace.styles.empty}</p>
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
                <span className="truncate">{m.workspace.styles.update(active.name)}</span>
              </Button>
            )}
            <Button onClick={onSave} className="justify-start">
              <AddIcon />
              {m.workspace.styles.saveNew}
            </Button>
            <div className="flex gap-1.5">
              <Button variant="ghost" onClick={onImport} className="flex-1 justify-center">
                <PickFileIcon />
                {m.workspace.styles.import}
              </Button>
              <Button
                variant="ghost"
                onClick={() => active && onExport(active)}
                disabled={!active}
                className="flex-1 justify-center"
                title={active ? m.workspace.styles.exportAs(active.name) : m.workspace.styles.exportNone}
              >
                <JsonIcon />
                {m.core.shortcuts.export}
              </Button>
            </div>
          </div>
        </>
      )}
    </Menu>
  )
}
