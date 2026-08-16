/** Primitives de validation partagées par les parseurs de données externes —
 *  un style importé (`styles.ts`), une scène produite par une machine
 *  (`spec.ts`). Aucune ne jette : chacune retombe sur la valeur par défaut, à
 *  charge de l'appelant de refuser un document dont la forme même est fausse. */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

export const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback

export const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Couleur hexadécimale à six chiffres — la seule forme que le rendu manipule. */
export const HEX = /^#[0-9a-f]{6}$/i
