/* Ce que la vitrine de la landing dit en cours de route. Le texte statique de
   la page, lui, est dans `index.html` (et `src/landing/html.fr.ts`). */

export const landingEn = {
  toLight: 'Switch to light theme',
  toDark: 'Switch to dark theme',
  keys: { t: 'Text', a: 'Arrow', r: 'Box', b: 'Blur' },
  /** Les textes posés par `T` : sur la démo, puis sur une capture collée. */
  texts: {
    demo: ['Revenue up 18% this quarter', 'Weekly export is live', 'Best month yet'],
    user: ['Look here', 'New', 'Ship it'],
  },
  caption: 'screenmat.webp · 3200 × 2400 · background from its own colours',
  added: (name: string, baked: boolean) => `${name} added${baked ? ' — baked into the pixels' : ''} · ⌫ to undo`,
  stopped: 'The demo stopped.',
  yours: 'Your screenshot, rendered locally. Try T A R B.',
  unreadable: 'That file could not be read as an image.',
  demoUnavailable: (status: number) => `Demo capture unavailable (${status})`,
  demoFailed: 'The demo could not load.',
  pasteHow: 'Copy a screenshot, then press ⌘V anywhere on this page — or drop it on the frame.',
  noImage: 'No image in there. Paste a screenshot, or drop a PNG, JPEG or WebP.',
  handoffFailed: 'Could not hand the screenshot to the editor.',
}
