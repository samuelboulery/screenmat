---
{
  "id": "T-0014",
  "titre": "Passe de design : rayons, tailles, espacements",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "m",
  "tags": [
    "design",
    "a11y"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0009",
  "plan": "2026-08-16-shotframe-systeme-d-icones-unifie-passe-de-design.md"
}
---

## Contexte

Seize rayons différents cohabitent (`rounded`, `-sm`, `-md`, `-lg`, `-xl`,
`-2xl`, `-full`, plus `[2px] [3px] [4px] [5px] [7px] [9px] [10px] [14px]
[20px]`), deux opacités de `disabled`, trois paddings de `Button`, trois tailles
de case (38, 40, 44 px), et des gaps hors échelle (`gap-[14px]`).

Rien de cassé — c'est de la dérive, et elle se corrige d'un seul balayage, pas
fichier par fichier au fil de l'eau.

## Critères d'acceptation

- [ ] `@theme` porte `--radius-xs/sm/md/lg/xl` (4/7/10/14/20 px) ; plus aucune
      valeur `rounded-[Npx]` dans `src/`.
- [ ] Une seule opacité de `disabled` : 40 %.
- [ ] `Button` : paddings alignés, variant `ghost` rendu à son usage icône.
- [ ] Cases à 40 px (`Presets` ne fait plus 38) ; le rail garde ses 44 px assumés.
- [ ] Plus de gap ni de padding arbitraire hors échelle Tailwind.
- [ ] Le rendu exporté est inchangé : ces correctifs ne touchent que le chrome DOM.
