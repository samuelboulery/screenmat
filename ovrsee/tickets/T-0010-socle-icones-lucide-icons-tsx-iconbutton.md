---
{
  "id": "T-0010",
  "titre": "Socle icônes : lucide, icons.tsx, IconButton",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "m",
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

Rien ne peut commencer avant que le jeu d'icônes ait un point d'entrée unique et
une grammaire fixée. Sans ça, chaque composant réglerait sa taille et son
`strokeWidth` dans son coin — exactement le désordre qu'on vient corriger.

La taille et l'épaisseur se règlent une fois en CSS sur la classe `.lucide` que
Lucide pose sur chaque `<svg>` : 16 px et `stroke-width: 1.5`, le 2 px par
défaut écraserait une DA dont les filets font 1 px.

## Critères d'acceptation

- [ ] `lucide-react` installé par `pnpm add`, `packageManager` et lockfile à jour.
- [ ] `src/index.css` porte la règle `.lucide` (16 px, `stroke-width: 1.5`,
      `flex: none`).
- [ ] `src/components/icons.tsx` existe : ré-exports et tables
      `Record<clé, LucideIcon>` ; les noms d'export Lucide sont vérifiés contre
      `node_modules`, pas supposés.
- [ ] `ui.tsx` expose `IconButton` avec une prop `label` obligatoire alimentant
      `title` **et** `aria-label`.
- [ ] `pnpm exec tsc -b` passe.
