export type Rgb = readonly [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** Luminance perçue, 0 (noir) à 1 (blanc). Suffisant pour trancher clair/sombre. */
export function luminance([r, g, b]: Rgb): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/**
 * Ramène une couleur à une luminance cible en gardant sa teinte, par simple
 * mise à l'échelle des canaux.
 *
 * ponytail: pas de conversion HSL — un facteur multiplicatif suffit tant que la
 * cible reste modérée. Une couleur très saturée poussée vers le clair verra ses
 * canaux buter à 255 et se désaturer un peu ; passer par HSL si ça devient
 * gênant.
 */
export function withLuminance(color: Rgb, target: number): Rgb {
  const current = luminance(color)
  if (current <= 0.001) return [target * 255, target * 255, target * 255]
  const factor = target / current
  return [
    Math.min(255, color[0] * factor),
    Math.min(255, color[1] * factor),
    Math.min(255, color[2] * factor),
  ]
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function css([r, g, b]: Rgb, alpha = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
}
