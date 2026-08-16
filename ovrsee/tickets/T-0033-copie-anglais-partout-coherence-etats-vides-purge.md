---
{
  "id": "T-0033",
  "titre": "Copie : anglais partout, cohérence, états vides, purge confirmée",
  "colonne": "revue",
  "priorite": "moyenne",
  "charge": "s",
  "tags": [
    "copy",
    "a11y"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0026",
  "plan": "2026-08-16-shotframe-corriger-les-15-constats-de-la-revue-d-interface.md"
}
---

## Contexte

**Constat 11** — cinq noms accessibles sont en français dans une UI anglaise.
`Toggle label="Inverser le fond et le texte"` est posé à côté du libellé visible
`Invert` : le nom accessible ne contient pas le texte visible, donc la commande
vocale « Invert » n'atteint pas l'interrupteur (WCAG 2.5.3).

**Extension du constat 14, trouvée en préparant le plan** — sept messages
d'erreur exposés à l'utilisateur sont en français (`Import impossible`,
`Lecture du fichier impossible`, `Ouverture IndexedDB impossible`…). Ils sont
aussi rédigés comme des constats d'échec, pas comme des instructions.

**Constat 14** — le même réglage s'écrit `PNG`/`WebP` dans l'inspecteur et
`png`/`webp` dans le lot ; le bouton de tri de l'historique est libellé par son
état courant (`newest`), donc on ne sait pas si un clic décrit ou agit ; le
placeholder d'URL est `exemple.com` ; la notation des raccourcis mélange
`Undo ⌘Z` et `Send backward (⌘↓)`.

**Constat 13** — au premier lancement, quatre boîtes vides sous « Recent — this
browser » se lisent comme un chargement bloqué ; History sans export n'affiche
qu'une case pointillée et « 0 of 0 exports ».

**Constat 9** — `Purge the oldest` supprime sans retour, deux mots après « there
is no copy anywhere else », alors que « New session » — moins destructif, les
shots se recollent — confirme déjà.

## Critères d'acceptation

- [ ] Aucune chaîne visible ni nom accessible en français ne subsiste dans
      `src/`.
- [ ] Le nom accessible de chaque contrôle commence par son libellé visible.
- [ ] Les messages d'erreur disent quoi faire, pas seulement ce qui a échoué.
- [ ] Un même réglage porte la même casse partout ; une seule notation de
      raccourci.
- [ ] Le bouton de tri est libellé par ce qu'il montre, pas par un mot qui peut
      se lire comme l'action.
- [ ] Sans aucun export, Import et History orientent vers l'action au lieu
      d'afficher des cases muettes ou « 0 of 0 ».
- [ ] La purge demande confirmation en nommant la conséquence.
