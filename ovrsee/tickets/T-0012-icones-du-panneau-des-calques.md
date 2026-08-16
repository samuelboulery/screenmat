---
{
  "id": "T-0012",
  "titre": "Icônes du panneau des calques",
  "colonne": "revue",
  "priorite": "moyenne",
  "charge": "m",
  "tags": [
    "ui",
    "a11y"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0009",
  "plan": "2026-08-16-shotframe-systeme-d-icones-unifie-passe-de-design.md"
}
---

## Contexte

`◉`/`◌` pour la visibilité, `⊘`/`○` pour le verrou, `›`/`⌄` pour le repli : trois
paires de glyphes que rien ne relie, et un composant `Toggle` local dans
`LayersPanel.tsx:223` qui n'a rien à voir avec le `Toggle` (interrupteur) de
`ui.tsx`. Les boutons d'ordre de pile de `AnnotateInspector` portent en plus une
opacité `disabled` différente du reste de l'app.

## Critères d'acceptation

- [ ] `LayersPanel.tsx` : `Eye`/`EyeOff`, `LockOpen`/`Lock`,
      `ChevronDown`/`ChevronRight` ; le `KIND_LABEL` texte devient l'icône de
      l'outil qui a créé le calque.
- [ ] Le `Toggle` local a disparu au profit d'`IconButton` — plus de collision
      de nom avec `ui.tsx`.
- [ ] `AnnotateInspector.tsx` : ordre de pile, group/ungroup et delete en icônes,
      `opacity-30` aligné sur `opacity-40`.
- [ ] Les icônes sont alignées optiquement sur la ligne de texte du calque.
