/* L'inspecteur : réglages du document, du fond, d'un calque et d'un style. Les
   clés d'objet qui reprennent une valeur (`macbook`, `tilt3d`, `blur`…) sont
   indexées par elle au rendu : les renommer casse `tsc -b`, pas l'affichage. */

export const inspectorEn = {
  panel: {
    back: 'Document',
    backTitle: 'Back to the document (Escape)',
  },
  /** Libellés que plusieurs sections partagent. */
  common: {
    size: 'Size',
    opacity: 'Opacity',
    shadow: 'Shadow',
    noShadow: 'none',
    corners: 'Corners',
    padding: 'Padding',
    width: 'Width',
    stroke: 'Stroke',
    background: 'Background',
    offsetY: 'Offset Y',
    auto: 'auto',
  },
  frame: {
    title: 'Frame',
    frames: { none: 'none', browser: 'browser', macbook: 'mac', iphone: 'phone' },
    rotateY: 'Rotate Y',
    shadows: { soft: 'soft', medium: 'medium', hard: 'hard' },
  },
  screen: {
    deviceRatio: 'Device ratio',
    keepDeviceRatio: 'Keep the device ratio',
    screenRatio: 'Screen ratio',
    island: 'Island',
    sides: {
      left: { label: 'Left', title: 'Island on the left' },
      right: { label: 'Right', title: 'Island on the right' },
    },
    panHint: 'Hold Space and drag to reposition the image.',
  },
  titleBar: {
    title: 'Title bar',
    show: 'Show title bar',
    url: 'URL shown in the title bar',
    themes: { auto: 'auto', light: 'light', dark: 'dark' },
  },
  canvas: {
    title: 'Canvas',
  },
  composition: {
    title: 'Composition',
    layouts: { stack: 'Stack', side: 'Grid', tilt3d: 'Tilt 3D' },
    gap: 'Gap',
    spread: 'Spread',
    columns: 'Columns',
    converge: 'Converge',
    elevation: 'Elevation',
  },
  shot: {
    title: 'Shot',
    dragHint: '⌥-drag to move',
    offsetX: 'Offset X',
  },
  background: {
    series: {
      screenshot: { label: 'Screenshot', title: 'Backgrounds drawn from the screenshot colours' },
      dither: { label: 'Dither', title: 'Two-tone dithered backgrounds' },
      macos: { label: 'macOS', title: 'The macOS wallpapers, Big Sur to Golden Gate' },
      windows: { label: 'Windows', title: 'The Windows wallpapers, XP to 11' },
    },
    useImage: 'Use an image as background',
    seed: (seed: number) => `Seed ${seed}`,
    shuffle: 'shuffle',
    saturation: 'Saturation',
    contrast: 'Contrast',
    grain: 'Grain',
    cellSize: 'Cell size',
    angle: 'Angle',
  },
  shapes: {
    title: 'Shapes',
    count: 'Count',
    blur: 'Blur',
  },
  palette: {
    base: 'Base color',
    accent: (index: number) => `Accent ${index}`,
    max: (count: number) => `${count} colors maximum`,
    add: 'Add a color',
    remove: (label: string) => `Remove ${label.toLowerCase()}`,
    reset: 'Reset to screenshot colours',
    hint: 'From the screenshot — pick a colour to change it',
  },
  redaction: {
    title: 'Redaction',
    shapes: { rect: 'rectangle', ellipse: 'ellipse' },
    modes: { blur: 'blur', pixel: 'pixel', solid: 'solid' },
    note: 'Baked into the pixels at export — the original is never recoverable from the file.',
  },
  color: {
    title: 'Color',
    text: 'Text color',
    custom: 'Custom color',
    /** Noms accessibles des champs du sélecteur, à partir du sien. */
    hex: (label: string) => `${label}, hex`,
    opacity: (label: string) => `${label}, opacity`,
  },
  badge: {
    title: 'Badge',
    invert: 'Invert',
  },
  segment: {
    head: 'Head',
  },
  text: {
    title: 'Text',
    weights: { '400': 'Regular', '500': 'Medium', '600': 'Semibold', '700': 'Bold' },
    aligns: { left: 'Left', center: 'Center', right: 'Right' },
    plateColor: 'Background color',
    layerText: 'Layer text',
  },
  shape: {
    appearance: 'Appearance',
    fill: 'Fill',
    fillColor: 'Fill color',
    strokeColor: 'Stroke color',
    needsInk: 'A shape needs a fill or a stroke',
  },
  style: {
    title: 'Style',
    name: 'Style name',
    note: 'Settings you change here stay in the image until you choose Update in the Styles menu.',
    remove: 'Delete style',
  },
  watermark: {
    title: 'Watermark',
    drop: 'drop logo.svg',
    remove: 'Remove logo',
  },
  layer: {
    title: (count: number) => (count > 1 ? `Layers — ${count}` : 'Layer'),
    kinds: {
      text: 'Label',
      badge: 'Badge',
      arrow: 'Arrow',
      line: 'Line',
      box: 'Box',
      ellipse: 'Ellipse',
      redaction: 'Redact',
    },
    group: 'Group',
    count: (count: number) => (count === 1 ? '1 layer' : `${count} layers`),
    backward: 'Send backward (⌘↓)',
    forward: 'Bring forward (⌘↑)',
    ungroup: 'Ungroup (⇧⌘G)',
    groupAction: 'Group (⌘G)',
    remove: 'Delete (⌫)',
  },
}
