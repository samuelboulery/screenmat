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

/**
 * Luminance relative au sens WCAG — canaux linéarisés. Plus lourde que
 * `luminance`, mais c'est la seule qui prédit un contraste lisible : un violet
 * moyen paraît clair au calcul naïf et porte pourtant du texte sombre.
 */
export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Rapport de contraste WCAG entre deux couleurs, de 1 à 21. */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(hexToRgb(a))
  const second = relativeLuminance(hexToRgb(b))
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

/**
 * L'encre la plus lisible sur un aplat de cette couleur. Règle unique du
 * produit : le badge, le label rempli et ce qui viendra ensuite s'y réfèrent,
 * plutôt que de reposer chacun un seuil dans son coin.
 */
export function inkOn(hex: string, dark = '#07070A', light = '#FFFFFF'): string {
  return contrastRatio(hex, dark) >= contrastRatio(hex, light) ? dark : light
}

export function css([r, g, b]: Rgb, alpha = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
}
