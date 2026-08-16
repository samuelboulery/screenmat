---
{
  "id": "T-0059",
  "titre": "Fusionner Compose et Annotate en un écran Edit",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "l",
  "tags": [
    "ui",
    "navigation",
    "editeur"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "epic": "T-0056",
  "plan": "2026-08-16-shotframe-refonte-de-la-navigation-harmonisation-des-etats-s.md"
}
---

## Contexte

Compose et Annotate ne sont pas deux tâches, ce sont deux moitiés de la même :
embellir un screenshot et l'annoter. Les séparer oblige à un aller-retour de
mode pour ajouter une flèche, et fait porter au rail gauche deux sémantiques —
un instrument en Annotate, une catégorie de l'inspecteur en Compose.

Un seul écran : le rail ne porte que des instruments, l'inspecteur porte tout le
reste, y compris le panneau de calques et le style du calque sélectionné.

## Critères d'acceptation

- [ ] `EditorScreen` n'a plus de prop `mode` ; `COMPOSE_TOOLS` et le type
      `ComposeTool` n'existent plus.
- [ ] Le rail affiche les instruments (`SEL TXT NUM ARR LIN BOX ELL RDC`) sur
      tout l'écran Edit, `SEL` par défaut.
- [ ] `AnnotateInspector.tsx` est supprimé : un inspecteur unique affiche
      Layers (si le shot a des calques), le style du calque (si sélection), puis
      Frame, Background, Depth & layout, Title bar, Blur & grain, Presets.
- [ ] Chrome de canvas : avec `SEL` et aucun calque sélectionné, aucune poignée
      ni cadre — le canvas montre exactement l'export. Les poignées
      apparaissent dès qu'un calque est sélectionné ou qu'un instrument de tracé
      est actif ; `Escape` ramène au canvas propre.
- [ ] Coller un screenshot puis tracer une flèche ne demande aucun changement
      d'écran.
- [ ] Sous 1100 px, rail horizontal et feuille d'inspecteur fonctionnent comme
      avant.
