---
{
  "id": "T-0023",
  "titre": "CLI shotframe",
  "epic": "T-0019",
  "colonne": "backlog",
  "priorite": "moyenne",
  "charge": "m",
  "tags": ["cli"],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-pilotable-par-une-machine.md"
}
---

## Contexte

Enveloppe sans logique autour de `render()` et `inspect()`.

```
shotframe <input…> [options]        rendu direct
shotframe --spec scene.json         scène complète, annotations comprises
shotframe inspect <input>           dimensions + fenêtre en fractions
shotframe styles                    styles disponibles

  -o, --out · --out-dir · --style <nom|path> · --scale 1|2|3 · --format png|webp
  --frame · --background · --ratio · --padding · --radius · --seed · --url
  --shadow · --grain · --json
```

Deux points qui comptent pour un appelant non humain :

- **`shotframe capture.png` sans autre argument doit déjà donner un bon
  résultat.** C'est le cas d'usage principal : une IA n'a ni goût ni contexte
  visuel. Les défauts plus le fond dérivé de la palette du screenshot suffisent.
- **`--json`** émet `{ output, width, height, bytes, settings }` sur stdout : un
  objet à lire, pas une phrase à parser. Erreurs sur stderr, code non nul.

Parsing des arguments : `parseArgs` de `node:util`, dans la stdlib. Pas de
commander.

**Le pont avec l'app web** : `~/.shotframe/styles/*.json` est exactement le
format que l'app exporte déjà (`exportStyle`/`parseStyle`). On règle un style à
l'œil dans l'interface, on l'exporte dans ce dossier, la machine le rappelle par
son nom (`--style docs`). Aucun nouveau format, aucun réglage dupliqué.

## Critères d'acceptation

- [ ] `shotframe capture.png` seul produit un visuel présentable.
- [ ] `shotframe capture.png --json` sort un JSON parsable et un code 0.
- [ ] Une entrée absente écrit sur stderr et sort en code non nul.
- [ ] `--format webp` sans encodeur disponible échoue clairement — jamais un
      `.webp` contenant du PNG (même garde-fou que `canvasToBlob`).
- [ ] Un style exporté depuis l'app et déposé dans `~/.shotframe/styles/` est
      rappelable par `--style <nom>`.
- [ ] Le rendu CLI se superpose au rendu web sur les 7 captures de référence.
