import type { landingEn } from './landing.en.ts'

export const landingFr: typeof landingEn = {
  toLight: 'Passer au thème clair',
  toDark: 'Passer au thème sombre',
  keys: { t: 'Texte', a: 'Flèche', r: 'Rectangle', b: 'Flou' },
  texts: {
    demo: ['Revenus en hausse de 18 % ce trimestre', 'L’export hebdo est en ligne', 'Meilleur mois à ce jour'],
    user: ['Regardez ici', 'Nouveau', 'On livre'],
  },
  caption: 'screenmat.webp · 3200 × 2400 · fond tiré de ses propres couleurs',
  // Le nom change de genre (« Flèche », « Texte ») : c'est le calque qui s'accorde.
  added: (name, baked) => `${name} : calque ajouté${baked ? ' — cuit dans les pixels' : ''} · ⌫ pour annuler`,
  stopped: 'La démo s’est arrêtée.',
  yours: 'Votre capture, rendue sur place. Essayez T A R B.',
  unreadable: 'Ce fichier n’a pas pu être lu comme une image.',
  demoUnavailable: (status) => `Capture de démo indisponible (${status})`,
  demoFailed: 'La démo n’a pas pu se charger.',
  pasteHow: 'Copiez une capture, puis appuyez sur ⌘V n’importe où sur cette page — ou déposez-la sur le cadre.',
  noImage: 'Aucune image là-dedans. Collez une capture, ou déposez un PNG, un JPEG ou un WebP.',
  handoffFailed: 'La capture n’a pas pu être transmise à l’éditeur.',
}
