---
{
  "id": "T-0025",
  "titre": "Documenter la porte machine",
  "epic": "T-0019",
  "colonne": "fait",
  "priorite": "basse",
  "charge": "s",
  "tags": ["docs"],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-pilotable-par-une-machine.md"
}
---

## Contexte

Une seconde porte d'entrée sur le moteur qui n'est écrite nulle part se
réinvente à la session suivante, ou pire, se contourne par un second chemin de
rendu.

À mettre à jour :

- **`CLAUDE.md`** : `cli/` dans l'arbre d'architecture, section « Pilotage par
  une machine », et la convention qui compte — le CLI n'est qu'une enveloppe,
  `renderScene()` reste le seul moteur, `@napi-rs/canvas` vit en
  `optionalDependencies` et n'est jamais importé par `src/`.
- **`.claude/rules/shotframe-conventions.md`** : la règle « un seul chemin de
  rendu » vaut aussi côté Node ; `cli/dom-shim.ts` est le seul endroit où une
  globale se polyfille.
- **README** : installation MCP, format de scène, exemple d'import depuis un
  script de dev.
- **`package.json`** : `bin`, `exports`, `optionalDependencies`, script `cli`.

## Critères d'acceptation

- [ ] Une session Claude qui ouvre le projet sait, sans explorer, qu'il existe un
      CLI, une API et un serveur MCP, et que le moteur reste unique.
- [ ] Le format de scène est documenté avec un exemple complet, coordonnées
      expliquées.
- [ ] Copier-coller la ligne `claude mcp add` du README suffit à installer le
      serveur.
