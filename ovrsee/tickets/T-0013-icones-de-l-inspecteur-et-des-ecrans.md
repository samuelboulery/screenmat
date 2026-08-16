---
{
  "id": "T-0013",
  "titre": "Icônes de l'inspecteur et des écrans",
  "colonne": "revue",
  "priorite": "moyenne",
  "charge": "l",
  "tags": [
    "ui"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0009",
  "plan": "2026-08-16-shotframe-systeme-d-icones-unifie-passe-de-design.md"
}
---

## Contexte

Reste tout le second rideau : `↻ shuffle` et la case `img` de l'inspecteur, les
six flèches de position du filigrane, les trois boutons `+` (presets, filmstrip,
couleurs), le `‹ Inspect` de la feuille rétractable, la recherche de l'historique
sans icône, et `LayoutIcon.tsx` — 60 lignes de rectangles CSS avec un `#8B8FA0`
codé en dur, hors tokens.

Les ratios (`4:3`, `16:9`…) restent en mono : c'est une donnée, pas une action.
Le badge `⌘ V` de l'écran d'import reste en texte : un raccourci clavier s'écrit.

## Critères d'acceptation

- [ ] `Inspector.tsx` : frames, layouts, shuffle et fond par image en icônes ;
      `LayoutIcon.tsx` supprimé (arbitrage validé dans le plan).
- [ ] `AnnotationStyle.tsx` : modes de floutage en icône + label, ton danger.
- [ ] `StylesScreen`, `BatchScreen`, `HistoryScreen`, `ImportScreen`,
      `Filmstrip`, `Presets`, `EditorScreen` : plus aucun glyphe détourné.
- [ ] `grep -rn "›\|‹\|⌄\|◉\|◌\|⊘\|↺\|↻\|↖\|↗\|↙\|↘" src/` ne rend plus que des
      commentaires.
