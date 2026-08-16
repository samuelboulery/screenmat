export type Ratio = '4:3' | '1:1' | '16:9' | '9:16' | 'auto'

export type Format = 'png' | 'webp'

/** Style de fenêtre dessiné autour du screenshot. */
export type FrameStyle = 'browser' | 'macbook' | 'iphone' | 'none'

/** Preset de fond. `image` utilise l'image fournie dans la `Scene`. */
export type BackgroundKind = 'mesh' | 'gradient' | 'solid' | 'image'

/** Disposition multi-shot. `single` n'affiche que le shot actif. */
export type LayoutKind = 'single' | 'stack' | 'side' | 'tilt3d'

export type AnnotationKind = 'text' | 'arrow' | 'box' | 'redaction'

export type RedactionMode = 'blur' | 'pixel' | 'solid'

export type LabelStyle = 'pill' | 'plain' | 'badge'

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

/** Réglages utilisateur. Toutes les valeurs de taille sont des fractions de la
 *  largeur du canvas ou de la fenêtre — jamais des pixels — pour que l'export
 *  3× soit l'exact homothétique de la preview. */
export type Settings = {
  /** Marge autour de la fenêtre, en fraction de la largeur du canvas. */
  padding: number
  ratio: Ratio
  /** Rayon des coins, en fraction de la largeur de la fenêtre. */
  radius: number
  titleBar: boolean
  theme: 'auto' | 'light' | 'dark'
  url: string
  /** Facteur de réduction du canvas de fond : plus il est grand, plus c'est flou. */
  blur: number
  shapes: number
  shapeOpacity: number
  grain: number
  /** Graine du PRNG : même graine ⇒ même fond, en preview comme à l'export. */
  seed: number
  /** PNG : sans perte, mais le grain est du bruit et fait exploser le poids.
   *  WebP : ~20× plus léger pour un résultat visuellement identique. */
  format: Format
  frame: FrameStyle
  background: BackgroundKind
  /** Rotation autour de l'axe Y, en degrés. Simulée par matrice (voir `depth.ts`). */
  rotateY: number
  /** Intensité de l'ombre portée, multiplicateur de `SHADOW_ALPHA`. */
  shadow: number
}

export type Palette = {
  /** Couleur dominante toutes teintes confondues — le plus souvent le fond de
   *  page du screenshot. Toujours définie (repli neutre si besoin). */
  base: string
  /** Couleurs franchement colorées, triées par population × saturation. Vide sur
   *  un screenshot entièrement neutre. */
  accents: string[]
}

/** Rectangle en fractions de la largeur du canvas (l'origine aussi : `y` est
 *  divisé par la largeur, pas par la hauteur, pour rester homothétique). */
export type FractionRect = {
  x: number
  y: number
  w: number
  h: number
}

export type Annotation = {
  id: string
  kind: AnnotationKind
  rect: FractionRect
  /** Texte du callout. Ignoré pour `box` et `redaction`. */
  text: string
  labelStyle: LabelStyle
  /** Taille de police, en fraction de la largeur du canvas. */
  size: number
  /** Mode de floutage. Ignoré hors `redaction`. */
  redaction: RedactionMode
}

export type Shot = {
  id: string
  name: string
  image: HTMLImageElement
  palette: Palette
  annotations: Annotation[]
}

export type Composition = {
  layout: LayoutKind
  /** Écartement entre fenêtres, en fraction de la largeur de la fenêtre. */
  spread: number
  /** Convergence des fenêtres en `tilt3d`, en degrés. */
  converge: number
  /** Décalage vertical entre fenêtres, en fraction de la largeur du canvas. */
  elevation: number
}

export type Watermark = {
  /** Image fournie par l'utilisateur, stockée en dataURL (aucun asset livré). */
  dataUrl: string
  position: WatermarkPosition
  opacity: number
  /** Largeur, en fraction de la largeur du canvas. */
  size: number
}

/** Un réglage complet, nommé et réutilisable. Remplace toute idée de « brand
 *  kit » d'équipe : c'est un objet local, partageable par fichier `.json`. */
export type Style = {
  id: string
  name: string
  settings: Settings
  /** Palette figée. Absente ⇒ les couleurs viennent de `extractPalette`. */
  palette?: Palette
  watermark?: Watermark
}

/** Ce que `renderScene` a besoin de connaître. Les images y sont déjà décodées :
 *  le moteur de rendu est synchrone, c'est l'appelant qui charge. */
export type Scene = {
  /** Au moins un shot. `composition.layout === 'single'` n'en dessine qu'un. */
  shots: Shot[]
  palette: Palette
  settings: Settings
  composition: Composition
  /** Image de fond décodée, requise si `settings.background === 'image'`. */
  backgroundImage?: HTMLImageElement
  watermark?: { image: HTMLImageElement; mark: Watermark }
}

export type QueueStatus = 'queued' | 'rendering' | 'done' | 'skipped' | 'error'

export type QueueItem = {
  shotId: string
  status: QueueStatus
  /** 0 à 1 pendant `rendering`. */
  progress: number
  error?: string
}

/** Un export passé, relisible depuis IndexedDB. On stocke aussi le screenshot
 *  d'origine : sans lui, « réouvrir » ne rouvrirait qu'une image plate. */
export type HistoryEntry = {
  id: string
  createdAt: number
  name: string
  ratio: Ratio
  scale: number
  bytes: number
  settings: Settings
  styleId?: string
  /** Vignette (dataURL, petite) — chargée avec la liste. */
  thumbnail: string
  /** Rendu final et screenshot source — chargés à la demande. */
  blob: Blob
  source: Blob
}

export const DEFAULT_SETTINGS: Settings = {
  padding: 0.065,
  ratio: '4:3',
  radius: 0.01,
  titleBar: true,
  theme: 'auto',
  url: 'exemple.com',
  blur: 8,
  shapes: 4,
  shapeOpacity: 0.75,
  grain: 0.35,
  seed: 1,
  format: 'png',
  frame: 'browser',
  background: 'mesh',
  rotateY: 0,
  shadow: 1,
}

export const DEFAULT_COMPOSITION: Composition = {
  layout: 'single',
  spread: 0.64,
  converge: 11,
  elevation: 0.0225,
}
