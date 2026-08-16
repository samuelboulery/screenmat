---
{
  "id": "T-0019",
  "titre": "Pilotage de shotframe par une machine",
  "type": "epic",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "xl",
  "tags": ["cli", "mcp", "api"],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-pilotable-par-une-machine.md"
}
---

## Contexte

shotframe ne s'utilise qu'à la main, dans un navigateur. Deux usages en sont
exclus :

- **Une IA** dans un projet quelconque devrait pouvoir dire « rends ces
  screenshots présentables, floute le token, mets une flèche sur le bouton »
  sans qu'un humain ouvre l'app et clique.
- **Un outil de dev** (script de build, générateur de docs, test) devrait
  pouvoir appeler shotframe comme une fonction, avec des réglages et sans
  annotations.

Ce qui rend la chose faisable sans réécrire le moteur : `src/lib/` est déjà pur,
`renderScene()` est le seul chemin de rendu, et la seule API navigateur dont il
dépend est Canvas 2D. Il manque un contexte 2D côté Node, un format de scène
sérialisable, et trois façades minces.

L'architecture tient en une ligne : **`render(spec)` est le cœur, le CLI, le
serveur MCP et l'import direct n'en sont que des enveloppes sans logique.**

À faire une fois le produit web stabilisé — ce n'est pas une fonctionnalité de
l'app, c'est une seconde porte d'entrée sur le même moteur.

## Critères d'acceptation

- [ ] Depuis un autre projet, une IA produit un visuel annoté sans que l'app web
      soit ouverte.
- [ ] Un script Node produit un visuel sans annotation en trois lignes.
- [ ] Le rendu CLI et le rendu web se superposent à réglages et `seed` égaux.
- [ ] `renderScene()` reste le seul code qui dessine un pixel : aucun second
      chemin de rendu n'est apparu.
