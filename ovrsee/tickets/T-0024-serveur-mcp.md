---
{
  "id": "T-0024",
  "titre": "Serveur MCP",
  "epic": "T-0019",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "s",
  "tags": ["mcp"],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-pilotable-par-une-machine.md"
}
---

## Contexte

`cli/mcp.ts`, stdio, dépendance `@modelcontextprotocol/sdk`. Zéro logique : il
appelle `render()` et `inspect()`. C'est ce qui rend shotframe utilisable par une
IA sans shell (Claude Desktop) et par n'importe quel projet Claude Code sans
qu'on lui explique le CLI.

| Outil | Entrée | Sortie |
|---|---|---|
| `shotframe_render` | une scène en ligne, même forme que le `.json`, + `output` | `{ output, width, height }` |
| `shotframe_inspect` | `input` | dimensions + fenêtre en fractions |
| `shotframe_list_styles` | — | noms + résumé des réglages |

Décisions à tenir :

- **La description des outils EST la documentation du modèle.** Il ne lira pas le
  README. Le système de coordonnées — fractions de la largeur de la fenêtre,
  origine en haut à gauche, `y` divisé par la largeur, `w`/`h` signés —
  s'écrit dans la description du schéma, avec un exemple de flèche. C'est là que
  se joue la qualité des annotations produites, pas dans le moteur.
- **On renvoie un chemin, pas l'image.** Une PNG en base64 coûte des milliers de
  tokens par appel, pour une image que le modèle n'a pas besoin de revoir.
- **Schémas Zod stricts**, adossés aux mêmes bornes que `parseScene` : un chemin
  et des nombres arrivent d'un modèle, donc du dehors.

Hors périmètre : pas de batch MCP (le modèle appelle N fois), pas d'écriture de
style depuis l'IA (un style se règle à l'œil, dans l'app).

## Critères d'acceptation

- [ ] `claude mcp add shotframe -- node <repo>/cli/mcp.ts` suffit à l'installer.
- [ ] Depuis un projet tiers, « floute la clé d'API sur ce screenshot et mets une
      flèche sur le bouton Deploy » produit le bon fichier, sans que l'app web
      soit ouverte.
- [ ] Les annotations tombent au bon endroit sans que l'utilisateur ait expliqué
      le système de coordonnées.
- [ ] Un chemin inexistant ou un nombre hors bornes est refusé par le schéma, pas
      par un crash plus loin.
- [ ] Aucune image encodée en base64 dans un résultat d'outil.
