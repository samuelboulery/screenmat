import { DITHERS, type Dither } from './dithered.ts'
import { MACOS_WALLPAPERS, WINDOWS_WALLPAPERS } from './wallpapers.ts'
import type { BackgroundKind } from '../types.ts'

/** Une famille de fonds, avec ses réglages. Jamais stockée : elle se déduit du
 *  type de fond, pour qu'un style ou une scène n'ait qu'une chose à dire. */
export type Series = 'screenshot' | 'macos' | 'windows' | 'dither'

/** Source unique : l'interface, la validation et la doc lisent cette table. La
 *  première variation d'une série est celle qu'on applique en la choisissant. */
export const SERIES: Record<Series, readonly BackgroundKind[]> = {
  screenshot: ['mesh', 'gradient', 'solid'],
  macos: MACOS_WALLPAPERS,
  windows: WINDOWS_WALLPAPERS,
  dither: Object.keys(DITHERS) as Dither[],
}

export const BACKGROUND_KINDS: readonly BackgroundKind[] = [...Object.values(SERIES).flat(), 'image']

export function seriesOf(kind: BackgroundKind): Series | null {
  const found = (Object.keys(SERIES) as Series[]).find((series) => SERIES[series].includes(kind))
  return found ?? null
}
