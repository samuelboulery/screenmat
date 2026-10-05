import type { messagesEn } from './messages.en.ts'

/* Les espaces insécables sont écrites ` ` : invisibles en clair, un
   éditeur ou un formateur les remplacerait sans que personne le voie. */

export const messagesFr: typeof messagesEn = {
  input: {
    noImage: 'Aucune image ici. Collez une capture, ou déposez un PNG, un JPEG ou un WebP.',
    openFailed: 'Impossible d’ouvrir cette image. Essayez un autre fichier.',
    handoffFailed: 'Impossible de récupérer la capture depuis la page d’accueil.',
    captureFailed: 'Impossible de capturer cet onglet. Réessayez, ou collez une capture.',
  },
  image: {
    unsupportedFormat: (type: string) => `Format non pris en charge : ${type || 'inconnu'}`,
    empty: 'Cette image est vide ou illisible',
    decodeFailed: 'Impossible de décoder cette image',
    wallpaperFailed: (kind: string) =>
      `Impossible de charger le fond d’écran ${kind}. Vérifiez votre connexion, puis choisissez un autre fond et revenez à celui-ci.`,
    wallpaperFallback: 'Impossible de charger ce fond d’écran',
    watermarkUnreadable: 'Impossible de lire ce filigrane',
    readFailed: 'Impossible de lire ce fichier. Essayez un PNG, un JPEG ou un WebP.',
    renderFailed: 'Le rendu a échoué',
  },
  style: {
    deleteTitle: 'Supprimer ce style ?',
    deleteBody: 'Cette action est irréversible.',
    deleteAction: 'Supprimer',
    selectFirst: 'Sélectionnez d’abord un style pour y attacher un logo',
    unreadable: 'Fichier illisible',
    notJson: 'Fichier illisible : ce n’est pas du JSON',
    notStyle: 'Ce fichier n’est pas un style screenmat',
    defaultName: (index: number) => `Style ${index}`,
    imported: 'Importé',
  },
  layers: {
    group: 'Groupe',
  },
  export: {
    failed: 'L’export a échoué. Essayez une échelle plus petite ou le format PNG.',
    copyFailed: 'La copie a échoué. Exportez plutôt le fichier, ou autorisez l’accès au presse-papiers.',
    batchFailed: 'L’export par lot a échoué. Essayez avec moins d’images ou une échelle plus petite.',
    historyFailed: 'Impossible d’enregistrer l’export dans l’historique',
    encodeFailed: (format: string) => `Ce navigateur n’a pas pu encoder le ${format}`,
    unsupported: (format: string) => `Ce navigateur ne prend pas en charge le ${format}`,
    noCanvas: 'Canvas 2D est indisponible',
    copyUnsupported: 'Ce navigateur ne permet pas de copier des images',
    kilobytes: (value: number) => `${Math.round(value)} Ko`,
    megabytes: (value: number) => `${value.toFixed(1).replace('.', ',')} Mo`,
  },
  storage: {
    unavailable: 'Le stockage local est indisponible',
    noIndexedDb: 'IndexedDB est indisponible : les styles et l’historique sont désactivés',
    blocked:
      'Fermez les autres onglets screenmat, puis rechargez la page : le stockage local est en cours de mise à jour.',
    openFailed: 'Impossible d’ouvrir le stockage local. La navigation privée le bloque sur certains navigateurs.',
    failed: (store: string) => `Le stockage local a échoué sur « ${store} »`,
    historyFailed: 'Impossible de lire l’historique des exports. Rechargez la page.',
    handoffFailed: 'Impossible de lire la capture transmise par la page d’accueil',
  },
  describe: {
    preview: (parts: string) => `Aperçu de l’export — ${parts}`,
    shots: (count: number) => (count > 1 ? `${count} images` : '1 image'),
    noFrame: 'sans cadre',
    frame: (frame: string) => `cadre ${frame}`,
    background: (background: string) => `fond ${background}`,
    layers: (count: number) => (count > 1 ? `${count} calques` : '1 calque'),
  },
}
