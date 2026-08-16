---
{
  "id": "T-0069",
  "titre": "Alléger le contexte résident : CLAUDE.md et skills",
  "colonne": "en-cours",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "tokens",
    "docs"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0062",
  "plan": "2026-08-16-shotframe-audit-d-optimisation-et-plan-de-correction.md"
}
---

## Contexte

Une session vaut `taille du contexte × nombre de tours`. Ce dépôt impose
~4 630 tokens résidents à chaque tour : `CLAUDE.md` (~4 000) et
`.claude/rules/shotframe-conventions.md` (~630), qui répètent les mêmes cinq
règles — un seul chemin de rendu, aucun appel réseau, pas de dépendance sans
demander, TS strict sans `any`, commentaires `ponytail:`.

L'arbre d'architecture est le plus gros poste (~830 tok) et le plus déductible :
`ls src/lib` donne les mêmes noms. Ce qui ne se déduit pas — `render.ts` est le
moteur unique, `tree.ts` le seul chemin de manipulation de l'arbre, `spec.ts`
valide une donnée externe — tient en trois lignes.

Le risque de la manœuvre est nommé : un agent qui écrit du composant sans
invoquer `shotframe-da` diverge de la direction artistique. D'où deux garde-fous,
tous les deux nécessaires.

## Critères d'acceptation

- [ ] `.claude/rules/shotframe-conventions.md` n'existe plus, et ce qu'il
      apportait en propre — organisation des fichiers, `dom-shim.ts` seul lieu de
      polyfill, emplacement des tests — vit dans `CLAUDE.md`.
- [ ] `CLAUDE.md` sous ~5 000 caractères : pitch, `Constraints`,
      `Code Conventions`, `Key Commands`, trois lignes de pointeurs vers les
      skills.
- [ ] Trois skills dans `.claude/skills/` : `shotframe-da` (DA Afterglow,
      écrans, raccourcis, références visuelles), `shotframe-moteur` (arbre `src/`
      et invariants de rendu détaillés), `shotframe-machine` (CLI, MCP, format de
      scène, `~/.shotframe/styles/`).
- [ ] Chaque description de skill se déclenche sur les mots qui apparaissent
      naturellement dans une demande — couleur, icône, composant, raccourci pour
      la DA ; canvas, calque, floutage, export pour le moteur.
- [ ] `CLAUDE.md` porte la phrase qui rend l'oubli visible : toucher à un
      composant, une couleur, une icône ou un raccourci sans avoir lu
      `shotframe-da`, c'est faire diverger la DA.
- [ ] Aucune des règles de l'ancien couple n'a disparu : chacune est soit dans
      `CLAUDE.md`, soit dans un skill.
