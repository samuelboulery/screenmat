import {
  AppWindow,
  Archive,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownNarrowWide,
  ArrowDownRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpNarrowWide,
  ArrowUpRight,
  Ban,
  Bookmark,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Columns2,
  Copy,
  Download,
  Droplet,
  Eye,
  EyeOff,
  FileJson,
  FilePlus2,
  FolderOpen,
  Grid3x3,
  Group,
  Hash,
  History,
  Image,
  ImagePlus,
  Laptop,
  Layers,
  Lock,
  LockOpen,
  MousePointer2,
  Palette,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Redo2,
  Rotate3d,
  Search,
  ShieldCheck,
  Shuffle,
  Slash,
  Smartphone,
  Square,
  SquareAsterisk,
  SquareSlash,
  Terminal,
  Trash2,
  TriangleAlert,
  Type,
  Undo2,
  Ungroup,
  Wand2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AnnotationKind, FrameStyle, LayoutKind, RedactionMode, WatermarkPosition } from '../types.ts'
import type { Tool } from './ToolRail.tsx'

/* Le jeu d'icônes de l'app, en un seul endroit. Rien n'importe `lucide-react`
   ailleurs : la cohérence du jeu se juge en relisant ce fichier, pas en
   parcourant vingt composants.

   La taille (16 px, 20 px dans le rail) et l'épaisseur du trait (1.5) sont
   posées en CSS sur la classe `.lucide` — voir `index.css`. Le 2 px par défaut
   de Lucide écraserait une DA dont les filets font 1 px. */

export type { LucideIcon }

/* ── Navigation ─────────────────────────────────────────────────────────── */

/** Une icône par destination — quatre, comme la barre haute. */
export const ScreenIcon = {
  edit: Wand2,
  batch: Boxes,
  styles: Palette,
  history: History,
} as const
export const LocalIcon = ShieldCheck

/* ── Outils ─────────────────────────────────────────────────────────────── */

export const TOOL_ICON: Record<Tool, LucideIcon> = {
  TXT: Type,
  SEL: MousePointer2,
  NUM: Hash,
  ARR: ArrowUpRight,
  LIN: Slash,
  BOX: Square,
  ELL: Circle,
  RDC: SquareAsterisk,
}

/** Un calque porte l'icône de l'outil qui l'a créé. */
export const KIND_ICON: Record<AnnotationKind, LucideIcon> = {
  text: Type,
  badge: Hash,
  arrow: ArrowUpRight,
  line: Slash,
  box: Square,
  ellipse: Circle,
  redaction: SquareAsterisk,
}

export const GroupIcon = Group
export const UngroupIcon = Ungroup
/** Une sélection de plusieurs calques, sans type commun à afficher. */
export const MultipleIcon = Layers

/* ── Réglages ───────────────────────────────────────────────────────────── */

export const FRAME_ICON: Record<FrameStyle, LucideIcon> = {
  browser: AppWindow,
  macbook: Laptop,
  iphone: Smartphone,
  none: Ban,
}

export const LAYOUT_ICON: Record<LayoutKind, LucideIcon> = {
  single: Square,
  stack: Copy,
  side: Columns2,
  tilt3d: Rotate3d,
}

export const REDACTION_ICON: Record<RedactionMode, LucideIcon> = {
  blur: Droplet,
  pixel: Grid3x3,
  solid: SquareSlash,
}

/** Les six coins où se pose le filigrane, dans le sens de la flèche. */
export const POSITION_ICON: Record<WatermarkPosition, LucideIcon> = {
  'top-left': ArrowUpLeft,
  'top-center': ArrowUp,
  'top-right': ArrowUpRight,
  'bottom-left': ArrowDownLeft,
  'bottom-center': ArrowDown,
  'bottom-right': ArrowDownRight,
}

/* ── Actions ────────────────────────────────────────────────────────────── */

export {
  Archive as ExportAllIcon,
  /* La pile se dit par une flèche : les deux icônes de profondeur de Lucide
     sont deux carrés qui se confondent à 16 px. */
  ArrowDown as BackwardIcon,
  ArrowUp as ForwardIcon,
  ArrowDownNarrowWide as SortNewestIcon,
  ArrowUpNarrowWide as SortOldestIcon,
  Bookmark as SaveStyleIcon,
  Check as CopiedIcon,
  ChevronDown as ExpandedIcon,
  ChevronRight as CollapsedIcon,
  Copy as CopyIcon,
  Download as ExportIcon,
  Eye as VisibleIcon,
  EyeOff as HiddenIcon,
  FileJson as JsonIcon,
  FilePlus2 as NewSessionIcon,
  FolderOpen as PickFileIcon,
  Image as ImageIcon,
  ImagePlus as NewShotIcon,
  Lock as LockedIcon,
  LockOpen as UnlockedIcon,
  PanelRightClose as CloseSheetIcon,
  PanelRightOpen as OpenSheetIcon,
  Plus as AddIcon,
  Redo2 as RedoIcon,
  Search as SearchIcon,
  Shuffle as ShuffleIcon,
  Check as CheckIcon,
  /* Un livre disait « documentation », pas « pour développeurs ». Le prompt d'un
     terminal le dit d'un coup d'œil, et couvre les trois façades. */
  Terminal as DevDocsIcon,
  Trash2 as DeleteIcon,
  TriangleAlert as WarningIcon,
  Undo2 as UndoIcon,
  X as CancelIcon,
}
