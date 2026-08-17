/**
 * Les quatre destinations de l'app. `edit` porte à lui seul l'embellissement et
 * l'annotation : ce sont deux moitiés du même geste, pas deux écrans. L'import
 * n'en fait pas partie — il se déduit de « aucun shot chargé ».
 */
export type Screen = 'edit' | 'batch' | 'styles' | 'history'

export type Ratio = '4:3' | '1:1' | '16:9' | '9:16' | 'auto'

export type Format = 'png' | 'webp'

/** Style de fenêtre dessiné autour du screenshot. */
export type FrameStyle = 'browser' | 'macbook' | 'iphone' | 'none'

/** Preset de fond. `image` utilise l'image fournie dans la `Scene`. */
export type BackgroundKind = 'mesh' | 'gradient' | 'solid' | 'image'

/** Disposition multi-shot. `single` n'affiche que le shot actif. */
export type LayoutKind = 'single' | 'stack' | 'side' | 'tilt3d'

export type AnnotationKind =
  | 'text'
  | 'badge'
  | 'arrow'
  | 'line'
  | 'box'
  | 'ellipse'
  | 'redaction'

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
  /** Multiplicateur de la saturation des couleurs de fond. 1 ⇒ celle du
   *  screenshot, 0 ⇒ un fond neutre, 2 ⇒ franchement coloré. La teinte, elle, ne
   *  bouge jamais. */
  saturation: number
  /** Écartement des taches par rapport à l'aplat, qui lui ne bouge pas.
   *  1 ⇒ rendu d'origine, 0 ⇒ fond plat, 2 ⇒ creusé. */
  contrast: number
  grain: number
  /** Graine du PRNG : même graine ⇒ même fond, en preview comme à l'export. */
  seed: number
  /** PNG : sans perte, mais le grain est du bruit et fait exploser le poids.
   *  WebP : le défaut, et 7 à 10× plus léger pour un résultat visuellement
   *  identique — mesuré à l'échelle 3, 11,5 Mo contre 1,5 Mo. */
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

/** Rectangle en fractions de la largeur de la FENÊTRE qu'il annote, origine au
 *  coin haut-gauche de cette fenêtre (`y` est divisé par la largeur, pas par la
 *  hauteur, pour rester homothétique). Une annotation appartient à son
 *  screenshot : elle le suit quand le padding, le ratio ou le layout changent.
 *
 *  `w` et `h` peuvent être négatifs — une flèche tracée vers le haut-gauche en
 *  dépend. Passer par `bounds()` pour obtenir un rectangle normalisé. */
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
  /** Nom affiché dans la pile. Vide ⇒ dérivé du texte, puis du type. */
  name: string
  /** Retiré du rendu — donc aussi de l'export — et du hit-test. */
  hidden: boolean
  /** Plus attrapable au clic ni au rectangle de sélection ; le panneau, lui,
   *  le sélectionne toujours. */
  locked: boolean
  /** Texte du callout. Ignoré hors `text`. */
  text: string
  labelStyle: LabelStyle
  /** Inverse le contraste d'un label ou d'un badge : la pastille prend la
   *  couleur du calque, le texte l'encre lisible dessus. Ignoré sur `plain`. */
  invert: boolean
  /** Taille de police, en fraction de la largeur de la fenêtre. */
  size: number
  /** Mode de floutage. Ignoré hors `redaction`. */
  redaction: RedactionMode
  /** Couleur du trait et du texte, en hexadécimal. */
  color: string
  /** Épaisseur du trait, en fraction de la largeur de la fenêtre. */
  strokeWidth: number
  /** Rayon des coins d'un `box`, en fraction de la largeur de la fenêtre. */
  radius: number
  /** Taille de la tête d'une `arrow`, en fraction de la largeur de la fenêtre. */
  arrowHead: number
  /** Opacité du remplissage d'un `box` ou d'une `ellipse`. 0 ⇒ contour seul. */
  fill: number
  /** Opacité du calque entier. */
  opacity: number
}

/** Regroupement de calques. `kind` discrimine un groupe d'une annotation dans
 *  un `LayerNode` — un groupe n'a pas de géométrie propre, il n'existe que dans
 *  la pile. */
export type LayerGroup = {
  id: string
  kind: 'group'
  name: string
  collapsed: boolean
  /** Masque ou verrouille tout le sous-arbre : un enfant hérite du plus
   *  restrictif de ses ancêtres. */
  hidden: boolean
  locked: boolean
  children: LayerNode[]
}

export type LayerNode = Annotation | LayerGroup

export type Shot = {
  id: string
  name: string
  image: HTMLImageElement
  palette: Palette
  /** Pile de calques, du fond vers l'avant. `flatten` (`lib/tree.ts`) en tire
   *  la liste plate que le rendu et le hit-test consomment. */
  layers: LayerNode[]
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
  /** Saisie de texte en cours : le caret est dessiné par le moteur, seule façon
   *  qu'il tombe au bon pixel quelle que soit l'échelle et la rotation. `blink`
   *  porte la phase du clignotement — la pastille, elle, reste affichée même
   *  vide, sinon elle disparaîtrait une fois sur deux. Absent de la scène
   *  d'export : un caret n'a rien à faire dans le fichier. */
  editing?: { id: string; caret: number; blink: boolean }
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
  radius: 0.018,
  titleBar: true,
  theme: 'auto',
  url: 'example.com',
  blur: 8,
  shapes: 4,
  shapeOpacity: 0.75,
  saturation: 1,
  contrast: 1,
  grain: 0.35,
  seed: 1,
  // Le grain est du bruit : il fait exploser un PNG. Mesuré à l'échelle 3,
  // 8,4 Mo en PNG contre 0,8 Mo en WebP, pour un résultat visuellement
  // identique. Là où l'encodeur WebP manque, `supportsWebp()` ramène au PNG.
  format: 'webp',
  // Le screenshot nu — coins arrondis, ombre portée — plutôt qu'un faux
  // navigateur : tout screenshot ne vient pas du web, et le cadre `browser`
  // reste à un clic.
  frame: 'none',
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
