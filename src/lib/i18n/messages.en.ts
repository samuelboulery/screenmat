/* Ce que disent les hooks et la logique pure : erreurs, confirmations, noms par
   défaut, nom accessible du canvas. */

export const messagesEn = {
  input: {
    noImage: 'No image in there. Paste a screenshot, or drop a PNG, JPEG or WebP.',
    openFailed: 'Couldn’t open that image. Try another file.',
    handoffFailed: 'Couldn’t pick up the screenshot from the home page.',
  },
  image: {
    /** `type` est le type MIME annoncé par le fichier, vide s'il n'en dit rien. */
    unsupportedFormat: (type: string) => `Unsupported format: ${type || 'unknown'}`,
    empty: 'This image is empty or unreadable',
    decodeFailed: 'Could not decode this image',
    /** `kind` est l'identifiant brut du fond (`sequoia`, `bliss`…). */
    wallpaperFailed: (kind: string) =>
      `Could not load the ${kind} wallpaper. Check your connection, then pick another background and come back to it.`,
    wallpaperFallback: 'Could not load this wallpaper',
    watermarkUnreadable: 'Could not read this watermark',
    readFailed: 'Couldn’t read that file. Try a PNG, JPEG or WebP.',
    renderFailed: 'Rendering failed',
  },
  style: {
    deleteTitle: 'Delete this style?',
    deleteBody: 'This cannot be undone.',
    deleteAction: 'Delete',
    selectFirst: 'Select a style first to attach a logo to it',
    unreadable: 'Unreadable file',
    notJson: 'Unreadable file: not JSON',
    notStyle: 'This file is not a screenmat style',
    /** Noms écrits dans les données : créés dans la langue du moment, jamais retraduits. */
    defaultName: (index: number) => `Style ${index}`,
    imported: 'Imported',
  },
  layers: {
    /** Nom par défaut d'un groupe, écrit dans les données lui aussi. */
    group: 'Group',
  },
  export: {
    failed: 'Export failed. Try a smaller scale or the PNG format.',
    copyFailed: 'Copy failed. Export the file instead, or allow clipboard access.',
    batchFailed: 'Batch export failed. Try fewer shots or a smaller scale.',
    historyFailed: 'Could not save the export to history',
    /** `format` arrive déjà en capitales (`WEBP`, `PNG`). */
    encodeFailed: (format: string) => `This browser could not encode ${format}`,
    unsupported: (format: string) => `${format} is not supported by this browser`,
    noCanvas: 'Canvas 2D is unavailable',
    copyUnsupported: 'Copying images is not supported by this browser',
    kilobytes: (value: number) => `${Math.round(value)} KB`,
    megabytes: (value: number) => `${value.toFixed(1)} MB`,
  },
  storage: {
    unavailable: 'Local storage is unavailable',
    noIndexedDb: 'IndexedDB is unavailable: styles and history are disabled',
    blocked: 'Close the other screenmat tabs, then reload: local storage is being updated.',
    openFailed: 'Couldn’t open local storage. Private browsing blocks it on some browsers.',
    /** `store` est le nom brut du magasin IndexedDB. */
    failed: (store: string) => `Local storage failed on “${store}”`,
    historyFailed: 'Couldn’t read the export history. Reload the page.',
    handoffFailed: 'Could not read the handoff',
  },
  /** Le nom accessible du canvas. `frame` et `background` y restent les
   *  identifiants bruts des réglages. */
  describe: {
    preview: (parts: string) => `Export preview — ${parts}`,
    shots: (count: number) => (count > 1 ? `${count} shots` : '1 shot'),
    noFrame: 'no frame',
    frame: (frame: string) => `${frame} frame`,
    background: (background: string) => `${background} background`,
    layers: (count: number) => (count > 1 ? `${count} layers` : '1 layer'),
  },
}
