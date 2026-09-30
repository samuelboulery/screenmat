/* Les séries « macOS » et « Windows » : les vrais fonds d'écran d'Apple, de Big
   Sur à Golden Gate, et ceux de Microsoft, de XP à Windows 11 — pour qu'une
   capture ait l'air prise sur le bureau où elle l'a été. Ce sont des images —
   `public/wallpapers/`, produites par `docs/assets/wallpapers.ts` — que le
   moteur peint par le chemin de l'image perso (`drawCover`). Elles sont © Apple
   Inc. et © Microsoft Corporation, hors licence MIT : voir
   `public/wallpapers/NOTICE.md`. */

/** Source unique des identifiants : le type, la série, les fichiers et la doc
 *  en découlent. L'ordre est celui de la grille, du plus récent au plus ancien. */
export const MACOS_WALLPAPERS = [
  'golden-gate-light',
  'golden-gate-dark',
  'golden-gate-bridge',
  'tahoe-light',
  'tahoe-dark',
  'sequoia-light',
  'sequoia-dark',
  'sonoma-light',
  'sonoma-dark',
  'ventura-light',
  'ventura-dark',
  'monterey-light',
  'monterey-dark',
  'big-sur-day',
  'big-sur-night',
] as const

/** Bloom (11), Hero (10), les marguerites de 8, Harmony (7), Bliss (XP). Seul
 *  Bloom existe en 3840 px : les autres sont embarqués à leur taille d'origine
 *  et s'agrandissent au dessin. */
export const WINDOWS_WALLPAPERS = [
  'windows-11-light',
  'windows-11-dark',
  'windows-10',
  'windows-8',
  'windows-7',
  'windows-xp',
] as const

export const WALLPAPERS = [...MACOS_WALLPAPERS, ...WINDOWS_WALLPAPERS] as const

export type Wallpaper = (typeof WALLPAPERS)[number]

export function isWallpaper(kind: string): kind is Wallpaper {
  return (WALLPAPERS as readonly string[]).includes(kind)
}

/** Chemin du fichier sous `public/`, sans barre initiale : le web le préfixe de
 *  sa base, Node le résout depuis le dépôt. La vignette sert les tuiles du
 *  sélecteur, qui n'ont pas à charger vingt images de 3840 px. */
export function wallpaperPath(kind: Wallpaper, size: 'full' | 'thumb'): string {
  return size === 'full' ? `wallpapers/${kind}.webp` : `wallpapers/thumbs/${kind}.webp`
}
