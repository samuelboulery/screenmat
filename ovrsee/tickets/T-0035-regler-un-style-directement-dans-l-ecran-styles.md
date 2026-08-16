---
{
  "id": "T-0035",
  "titre": "Régler un style directement dans l'écran Styles",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "ui",
    "styles"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-shotframe-rendre-les-styles-editables-et-supprimables.md"
}
---

## Contexte

Le bloc « Locked in this style » est fait de `<div>` statiques
(`StylesScreen.tsx:160-177`) : Frame, Padding, Grain et Export s'affichent mais
ne se changent pas. Seul le nom est éditable. L'écran Styles se lit, il ne se
règle pas.

Les contrôles existent déjà dans l'Inspector — `Tile` + `FRAME_ICON`, `Slider`,
`Segmented` — et se réutilisent tels quels depuis `ui.tsx`. `FRAMES`
(`Inspector.tsx:16`) passe en `export const` plutôt que d'être recopié.

L'écriture est immédiate, sans bouton « Enregistrer », comme le champ nom. Le
patch part à la fois dans le style et dans les réglages de l'éditeur
(`App.tsx:68`) : `scene` en dérive, donc l'aperçu de droite devient juste sans
second chemin de rendu.

## Critères d'acceptation

- [ ] Frame, Padding, Grain et Export se modifient depuis le panneau central.
- [ ] L'aperçu de droite suit chaque changement en direct.
- [ ] De retour sur Editor, les réglages sont ceux qu'on vient de poser.
- [ ] Après rechargement de la page, les valeurs modifiées sont toujours là.
- [ ] `FRAMES` n'existe qu'à un seul endroit dans le code.
- [ ] `StylesScreen.tsx` reste sous 400 lignes, sinon le panneau central est
      extrait dans son propre fichier.
