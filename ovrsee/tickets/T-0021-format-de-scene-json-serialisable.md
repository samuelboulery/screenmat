---
{
  "id": "T-0021",
  "titre": "Format de scène JSON sérialisable",
  "epic": "T-0019",
  "colonne": "backlog",
  "priorite": "haute",
  "charge": "m",
  "tags": ["api", "annotations"],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": null
}
---

## Contexte

C'est ce qui permet à une machine d'atteindre **tout** le produit et pas
seulement les presets : un document JSON décrivant une scène entière — entrées,
réglages, composition, et les calques de chaque shot.

`src/lib/spec.ts`, logique pure, donc dans `lib/` et non dans `cli/` : testé par
Vitest avec le reste, et réutilisable par l'app web le jour où un « projet »
s'exportera comme un style s'exporte aujourd'hui.

```jsonc
{
  "kind": "shotframe-scene",
  "version": 1,
  "style": "docs",
  "settings": { "frame": "macbook", "ratio": "16:9", "seed": 42 },
  "composition": { "layout": "single" },
  "shots": [{
    "input": "./capture.png",
    "layers": [
      { "kind": "redaction", "redaction": "blur",
        "rect": { "x": 0.10, "y": 0.22, "w": 0.30, "h": 0.03 } },
      { "kind": "arrow", "color": "#7DE2FF",
        "rect": { "x": 0.62, "y": 0.28, "w": -0.18, "h": 0.06 } },
      { "kind": "text", "text": "Ici", "labelStyle": "pill",
        "rect": { "x": 0.44, "y": 0.46, "w": 0, "h": 0 } }
    ]
  }]
}
```

Décisions :

- **`layers` est optionnel.** Une scène sans calques est exactement l'usage
  « outil de dev, sans annotations » : un seul format couvre les deux besoins,
  il n'y a pas d'API réduite à maintenir à côté.
- **Coordonnées en `FractionRect` telles quelles** — fractions de la largeur de
  la *fenêtre*, origine à son coin haut-gauche, `y` divisé par la largeur lui
  aussi. Pas de troisième système de coordonnées. Contrepartie assumée : c'est
  contre-intuitif, donc ça s'écrit noir sur blanc là où la machine le lit.
- **`w`/`h` négatifs survivent** — c'est ce qui fait pointer une flèche dans les
  quatre quadrants. Le parser ne les « corrige » pas.
- **Tous les champs d'annotation exposés** (`color`, `strokeWidth`, `radius`,
  `arrowHead`, `fill`, `opacity`, `size`, `labelStyle`, `invert`, `redaction`),
  chacun optionnel et retombant sur `ANNOTATION_DEFAULTS`.

`parseScene()` suit **exactement** l'idiome de `parseStyle` (`lib/styles.ts`) :
champ par champ, `clamp`/`oneOf`, repli sur les défauts. Un JSON produit par un
modèle est une donnée externe au même titre qu'un `.json` importé à la main. Les
bornes existent déjà — `ANNOTATION_LIMITS`, `ANNOTATION_DEFAULTS`
(`lib/annotate.ts`) — et se réutilisent telles quelles.

Seule modification de `src/` : exporter `parseSettings`, aujourd'hui privé dans
`lib/styles.ts`.

Hors périmètre : les groupes de calques (`LayerGroup`). Une machine n'a aucune
raison de grouper ; `tree.ts` le supportera le jour où un spec exporté depuis
l'app en contiendra.

## Critères d'acceptation

- [ ] Un JSON vide donne une scène aux valeurs par défaut.
- [ ] Des valeurs hors bornes sont ramenées dans `ANNOTATION_LIMITS`.
- [ ] Un `w` négatif survit au parsing.
- [ ] Un `kind` inconnu est écarté sans faire tomber la scène.
- [ ] Un JSON invalide lève un message lisible, jamais un `undefined` plus loin.
- [ ] Les tests vivent dans `src/lib/__tests__/spec.test.ts` et couvrent les
      entrées hostiles.
