---
{
  "id": "T-0007",
  "titre": "Panneau Calques : arbre, drag & drop, œil et cadenas",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "xl",
  "tags": [
    "annotate",
    "ui",
    "a11y"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-annotation-rendu-live-texte-au-clic-couleurs-inver.md",
  "epic": "T-0001"
}
---

## Contexte

La liste de calques d'`AnnotateInspector` est plate et ne se réordonne que par
deux boutons `↑`/`↓`. Avec l'arbre (T-0002) et la multi-sélection (T-0006) en
place, elle devient un vrai panneau : `src/components/LayersPanel.tsx`, extrait
pour qu'`AnnotateInspector` reste sous le plafond de 400 lignes.

Le drag & drop se fait en HTML5 natif, sur le modèle déjà en place dans
`Filmstrip.tsx` — aucune dépendance à installer.

## Critères d'acceptation

- [ ] Lignes récursives : un groupe se replie, ses enfants sont indentés ; la
      pile se lit de haut en bas comme elle se dessine.
- [ ] Chaque ligne porte son badge de type, son nom, un œil (`hidden`) et un
      cadenas (`locked`) ; double-clic sur le nom l'édite en place, et un nom
      vide retombe sur la dérivation actuelle.
- [ ] Clic = remplace, ⌘-clic = bascule, ⇧-clic = plage.
- [ ] Glisser une ligne la dépose avant, après, ou dans un groupe selon la
      position du pointeur, avec un trait indicateur ; ⌘Z ramène chaque étape.
- [ ] Un calque verrouillé n'est plus attrapable au clic ni au marquee, mais
      reste sélectionnable depuis le panneau.
- [ ] `aria-grabbed` sur la ligne saisie ; ⌘↑/⌘↓ reste la voie clavier.
