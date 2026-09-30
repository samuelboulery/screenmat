/* Le français du balisage de la landing : une entrée par `data-i18n` ou
   `data-i18n-attr` d'`index.html`. Lu au build seulement (`vite-landing-fr.ts`),
   jamais par le navigateur — ce que la vitrine dit en cours de route vit dans
   `lib/i18n/landing.*.ts`. */

export const HTML_FR: Record<string, string> = {
  'meta.title': 'screenmat — transformer une capture d’écran en visuel prêt à partager',
  'meta.description':
    'Collez une capture d’écran : screenmat la cadre, peint un fond à partir de ses propres couleurs, l’annote, la floute et l’exporte — entièrement dans votre navigateur. Aussi un CLI, une API Node et un serveur MCP.',
  'meta.social':
    'Fenêtre façon macOS, fond génératif tiré des couleurs de la capture, annotations, floutage. Aucun backend, aucun compte, aucun téléversement — vos images ne quittent jamais le navigateur.',
  'meta.imageAlt': 'Une capture d’écran cadrée dans une fenêtre arrondie façon macOS, sur un fond génératif.',
  'meta.jsonld':
    'Transformer une capture d’écran brute en visuel prêt à partager — fenêtre façon macOS, fond génératif, annotations, floutage. Tout se passe dans le navigateur.',

  'nav.label': 'Sections',
  'nav.how': 'Fonctionnement',
  'nav.dev': 'Développeurs',
  'nav.theme': 'Changer de thème',

  'cta.open': 'Ouvrir l’éditeur',
  'cta.dev': 'Pour les développeurs',
  'cta.title': 'Collez votre première capture.',

  'hero.label': 'Capture → visuel à partager',
  'hero.title': 'Une capture brute entre. Un visuel partageable sort.',
  'hero.lead':
    'Collez une capture. screenmat la cadre, peint un fond à partir de ses propres couleurs, vous laisse pointer l’essentiel et flouter le reste — puis l’exporte. Le tout dans votre navigateur.',
  'hero.local': 'Tourne dans votre navigateur · rien n’est téléversé',

  'demo.label': 'Démo en direct',
  'demo.frame': 'Cadre de démo — cliquez, puis appuyez sur T, A, R ou B',
  'demo.canvas': 'Une capture d’écran cadrée par screenmat',
  'demo.text': 'Texte',
  'demo.arrow': 'Flèche',
  'demo.box': 'Rectangle',
  'demo.blur': 'Flou',
  'demo.paste': 'Coller la vôtre',
  'demo.pick': 'Choisir un fichier',
  'demo.replay': 'Rejouer l’intro',
  'demo.continue': 'Continuer dans l’éditeur →',
  'demo.hint': 'Cliquez sur le cadre et appuyez sur une touche — ou collez votre propre capture.',

  'how.title': 'Trois gestes, aucun réglage à apprendre.',
  'how.paste.title': 'Coller',
  'how.paste.body':
    'Une capture, ou tout un dossier. Le fond est tiré de ses couleurs dominantes : le résultat est juste avant que vous n’ayez touché à quoi que ce soit.',
  'how.adjust.title': 'Ajuster',
  'how.adjust.body':
    'Cadre, coins, inclinaison. Texte, flèches, rectangles, pastilles numérotées. Floutez ce qui doit rester privé — le flou est cuit dans les pixels, pas posé par-dessus.',
  'how.export.title': 'Exporter',
  'how.export.body':
    'WebP ou PNG en 1×, 2× ou 3× — jusqu’à 4800 px de large. Un lot entier part en un seul zip, chaque image dans le même style.',

  'privacy.label': 'Confidentialité',
  'privacy.title': 'Votre capture ne quitte jamais cet onglet.',
  'privacy.upload.title': 'Aucun téléversement.',
  'privacy.upload.body': 'Chaque pixel est dessiné par Canvas 2D, dans votre navigateur.',
  'privacy.account.title': 'Aucun compte.',
  'privacy.account.body': 'Styles et historique vivent dans le stockage de ce navigateur.',
  'privacy.offline.title': 'Fonctionne hors ligne.',
  'privacy.offline.body': 'Les polices sont embarquées ; le rendu ne télécharge rien.',
  'privacy.counter.title': 'Un seul compteur.',
  'privacy.counter.body': 'Un compteur de pages Cloudflare, sans cookie — aucun identifiant, aucune donnée d’image.',

  'dev.title': 'Le même moteur, depuis un script.',
  'dev.body':
    'Un CLI pour les scripts de build, une API Node pour les générateurs de doc, un serveur MCP pour les agents. Un seul moteur de rendu derrière les trois — celui-là même que cette page vient d’utiliser. Réglez un style à l’œil ici, exportez-le en JSON, appelez-le par son nom là-bas.',
  'dev.docs': 'Lire la doc (en anglais) →',
  'dev.mcp': '# MCP — n’importe quel client',
}
