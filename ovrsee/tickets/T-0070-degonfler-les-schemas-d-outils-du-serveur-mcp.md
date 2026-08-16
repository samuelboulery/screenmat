---
{
  "id": "T-0070",
  "titre": "Dégonfler les schémas d'outils du serveur MCP",
  "colonne": "revue",
  "priorite": "moyenne",
  "charge": "s",
  "tags": [
    "tokens",
    "mcp"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0062",
  "plan": "2026-08-16-shotframe-audit-d-optimisation-et-plan-de-correction.md"
}
---

## Contexte

`tools/list` renvoie 6 654 caractères, soit ~1 660 tokens résidents dans tout
client connecté, à chaque tour : `shotframe_render` ~1 034, `shotframe_inspect`
~522, `shotframe_list_styles` ~107.

Deux duplications en portent l'essentiel. Le bloc `REPERE` (`mcp.ts:20-28`,
~230 tok) est interpolé mot pour mot dans les descriptions de `render` et
d'`inspect`. Et le schéma `settings` (`mcp.ts:59-75`, 14 champs) est inliné dans
les deux outils alors qu'`inspect()` ne lit que la géométrie : `grain`, `seed`,
`format`, `theme`, `url`, `shadow` et `background` n'ont aucun effet sur sa
réponse — les exposer coûte des tokens et laisse croire l'inverse.

Le reste du serveur est déjà sobre : il renvoie un chemin, jamais une image en
base64, et le commentaire de `mcp.ts:123` dit pourquoi. Les `.describe()` par
champ du schéma `layer` sont ce qui rend les annotations justes : on n'y touche
pas.

## Critères d'acceptation

- [ ] `REPERE` n'apparaît plus que dans la description de `shotframe_inspect` ;
      `shotframe_render` le remplace par une ligne qui renvoie vers cet outil.
- [ ] `mcp.ts` sépare `geometrySettings` (`frame`, `ratio`, `padding`, `radius`,
      `rotateY`, `titleBar`) et `settings = geometrySettings.extend({…})` ;
      `shotframe_inspect` ne prend que le premier.
- [ ] Les `.describe()` du schéma `layer` sont inchangés.
- [x] `initialize` puis `tools/list` sur `node cli/mcp.ts` : **5 612 caractères**
      contre 6 654, soit −16 %. Les ~4 800 visés n'étaient atteignables qu'en
      coupant les `.describe()` du schéma `layer`, que ce même ticket protège :
      objectif abaissé plutôt que justesse sacrifiée.
- [ ] Non-régression de justesse : demander à un modèle, via le serveur, de
      flouter une zone lue en pixels sur un screenshot sans autre indication. Il
      appelle `shotframe_inspect` d'abord et pose la zone au bon endroit.
