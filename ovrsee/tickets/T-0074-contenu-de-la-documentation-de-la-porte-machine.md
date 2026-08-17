---
{
  "id": "T-0074",
  "titre": "Contenu de la documentation de la porte machine",
  "colonne": "fait",
  "priorite": "haute",
  "tags": [
    "docs"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-documentation-de-la-porte-machine-lien-docs-dans-la-barre-ha.md"
}
---

## Contexte

`cli/README.md` est aujourd'hui la seule documentation de `render()`, du CLI et
du serveur MCP : dense, et muette là où l'on se trompe vraiment — le repère de
coordonnées des calques, les bornes et défauts de chaque réglage, la précédence
entre style, flags et défauts.

Huit pages en anglais sous `public/docs/`, plus un `llms.txt` : la source est le
Markdown, lisible tel quel par un LLM, par `curl` et par GitHub.

## Critères d'acceptation

- [ ] `overview.md` · `cli.md` · `mcp.md` · `api.md` · `scene.md` ·
      `coordinates.md` · `styles.md` · `recipes.md` · `llms.txt` existent.
- [ ] Le tableau des flags du CLI est exhaustif : chaque flag de `cli/main.ts`
      y figure avec son type, son défaut et ses bornes.
- [ ] `scene.md` documente chaque champ de `SceneSpec` — `settings`,
      `composition`, `shots`, `layers`, `watermark`, `palette`, `scale` — avec
      défaut et bornes, et dit que la validation clampe et qu'un `kind` inconnu
      est écarté sans faire tomber la scène.
- [ ] Toute valeur citée est relue à la source (`DEFAULT_SETTINGS`,
      `ANNOTATION_LIMITS`, les clamps de `parseScene`/`parseSettings`, les
      schémas zod de `cli/mcp.ts`) — aucune recopie de mémoire.
- [ ] `coordinates.md` porte un schéma ASCII et un exemple chiffré de conversion
      pixel → fraction passant par `inspect()`.
- [ ] Les schémas sont en ASCII dans des blocs ` ```text ` — pas de SVG : le
      `.md` brut doit se lire aussi bien que la page.
- [ ] **Chaque exemple de commande et chaque scène JSON a été exécuté** avant
      publication ; un exemple qui ne tourne pas ne rentre pas.
