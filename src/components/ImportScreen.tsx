import { CaptureTabIcon, CopiedIcon, PickFileIcon, SaveStyleIcon } from './icons.tsx'
import { Button, ErrorNote, MonoLabel } from './ui.tsx'
import type { HistoryMeta } from '../lib/store.ts'
import { m } from '../lib/i18n/index.ts'
import { MAC } from '../lib/keys.ts'

type ImportScreenProps = {
  dragging: boolean
  error: string | null
  /** Le dernier style appliqué, s'il existe encore. */
  lastStyle: string | null
  /** Vrai une fois ce style appliqué : il vaudra pour la prochaine image. */
  lastStyleArmed: boolean
  recents: readonly HistoryMeta[]
  onPick: () => void
  /** Absent là où le navigateur ne sait pas partager un onglet. */
  onCaptureTab?: () => void
  onUseLastStyle: () => void
  onOpenRecent: (id: string) => void
}

/** Quatre emplacements : les vides restent dessinés tant que rien ne les remplit. */
const RECENT_SLOTS = 4

/** Premier écran, aucune image chargée. Une seule action évidente. */
export default function ImportScreen({
  dragging,
  error,
  lastStyle,
  lastStyleArmed,
  recents,
  onPick,
  onCaptureTab,
  onUseLastStyle,
  onOpenRecent,
}: ImportScreenProps) {
  const slots = Array.from({ length: RECENT_SLOTS }, (_, index) => recents[index] ?? null)

  return (
    // Ancré sous la barre haute, pas sur le viewport entier : centré sur tout
    // l'écran, le titre passait derrière la barre dès que la fenêtre raccourcit.
    // Et `min-h` plutôt que `h` : un centrage flex qui déborde vers le haut
    // n'est rattrapable par aucun scroll.
    <div className="stage-grain absolute inset-x-0 top-[58px] bottom-0 flex flex-col items-center justify-center-safe gap-11 overflow-y-auto px-5 py-8">
      <div
        className={`flex min-h-[372px] w-[720px] max-w-full shrink-0 flex-col items-center justify-center gap-5 rounded-xl border border-dashed p-8 transition-colors duration-140 ${
          dragging ? 'border-accent/45 bg-accent/5' : 'border-ink/[.16] bg-ink/[.02]'
        }`}
      >
        <span className="rounded-md border border-accent/30 bg-accent/[.08] px-4 py-3 font-mono text-[15px] text-accent-ink">
          {MAC ? '⌘ V' : 'Ctrl + V'}
        </span>
        <h1 className="t-headline text-[34px]">{m.core.shortcuts.paste}</h1>
        <p className="text-[14px] text-ink-soft">{m.workspace.importScreen.drop}</p>
        <div className="flex items-center gap-2.5">
          <Button variant="primary" onClick={onPick}>
            <PickFileIcon />
            {m.workspace.importScreen.pick}
          </Button>
          {onCaptureTab && (
            <Button onClick={onCaptureTab}>
              <CaptureTabIcon />
              {m.workspace.importScreen.captureTab}
            </Button>
          )}
          {/* Sans image, appliquer un style ne se voit pas : le bouton dit donc
              lui-même qu'il est pris, et pour quoi. */}
          <Button onClick={onUseLastStyle} disabled={!lastStyle}>
            {lastStyleArmed ? <CopiedIcon /> : <SaveStyleIcon />}
            <span className="max-w-56 truncate">
              {lastStyleArmed ? m.workspace.importScreen.ready(lastStyle) : m.workspace.importScreen.lastStyle}
            </span>
          </Button>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>

      <div className="w-[720px] max-w-full shrink-0 space-y-3">
        <MonoLabel>{m.workspace.importScreen.recent}</MonoLabel>
        {/* Quatre cases vides se lisaient comme un chargement bloqué. Tant qu'il
            n'y a rien, une phrase ; les emplacements reviennent au premier export. */}
        {recents.length === 0 ? (
          <p className="t-ui text-dim">{m.workspace.importScreen.recentEmpty}</p>
        ) : (
        <div className="grid grid-cols-4 gap-4">
          {slots.map((entry, index) =>
            entry ? (
              <button
                key={entry.id}
                type="button"
                onClick={() => onOpenRecent(entry.id)}
                title={entry.name}
                className="relative h-[106px] overflow-hidden rounded-md border border-hairline bg-sunken"
              >
                <img src={entry.thumbnail} alt="" className="size-full object-cover" />
                {/* Voile de lisibilité : sans lui, la métadonnée blanche
                    disparaît sur un screenshot clair. */}
                <span className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-stage/85 to-transparent" />
                <span className="t-mono-micro absolute right-2 bottom-1.5 left-2 flex justify-between text-ink/75">
                  <span className="truncate">{entry.name}</span>
                  <span>{entry.ratio}</span>
                </span>
              </button>
            ) : (
              <div
                key={`empty-${index}`}
                className="h-[106px] rounded-md border border-hairline bg-ink/[.03]"
              />
            ),
          )}
        </div>
        )}
      </div>
    </div>
  )
}
