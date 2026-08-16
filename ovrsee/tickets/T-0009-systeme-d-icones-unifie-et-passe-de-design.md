---
{
  "id": "T-0009",
  "type": "epic",
  "titre": "Système d'icônes unifié et passe de design",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "xl",
  "tags": [
    "ui",
    "design"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-systeme-d-icones-unifie-passe-de-design.md"
}
---

## Contexte

Trois langages visuels cohabitent aujourd'hui : abréviations mono (`FRM`, `BG`,
`SEL`…), glyphes Unicode détournés en icônes (`↺` `◉` `⊘` `›` `↖`) et
micro-icônes dessinées en CSS (`LayoutIcon.tsx`). Le commentaire en tête de
`ToolRail.tsx` posait le dilemme sans le trancher — « toutes ou aucune ». On
tranche pour toutes, avec **lucide-react**, et on corrige au passage les
incohérences accumulées : 16 rayons différents, deux opacités de `disabled`,
trois paddings de bouton, trois tailles de case, aucun `aria-label` sur les
boutons icône-seule.

## Critères d'acceptation

- [ ] Aucun glyphe Unicode ne sert plus d'icône dans `src/components/` — seuls
      restent les libellés de raccourci clavier (`⌘V`, `⌫`) et les commentaires.
- [ ] Toutes les icônes viennent de `lucide-react`, importées via le seul
      `src/components/icons.tsx`.
- [ ] Tout bouton icône-seule porte un nom accessible.
- [ ] `pnpm exec tsc -b`, `pnpm test` et `pnpm build` passent.
