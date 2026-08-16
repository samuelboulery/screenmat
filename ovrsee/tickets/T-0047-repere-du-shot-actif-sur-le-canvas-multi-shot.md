---
{
  "id": "T-0047",
  "titre": "Repère du shot actif sur le canvas multi-shot",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "s",
  "tags": [
    "ui",
    "canvas"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-allegement-de-la-barre-haute-repere-du-shot-actif.md"
}
---

## Contexte

Dès qu'une composition affiche plusieurs fenêtres (`stack`, `side`, `tilt3d`),
rien sur le canvas ne dit laquelle est active. Seule la vignette du filmstrip
porte `ring-selected` — il faut regarder ailleurs que là où on travaille pour
savoir qui reçoit les réglages.

Un trait d'accent seul ne suffit pas : `#7DE2FF` sur un artwork clair disparaît.
Le repère a besoin d'une garde sombre de part et d'autre pour tenir sur
n'importe quel fond, comme il tient sur la scène noire.

Ce repère est du chrome d'édition en DOM, au même titre que `SelectionOverlay` :
il ne passe pas par `renderScene()` et n'existe donc pas dans le fichier
exporté.

## Critères d'acceptation

- [ ] Avec deux shots ou plus dans la composition, la fenêtre active porte un
      anneau visible sur le canvas.
- [ ] L'anneau saute à la bonne fenêtre au clic sur une vignette du filmstrip.
- [ ] En `tilt3d`, l'anneau suit l'inclinaison de sa fenêtre et son arrondi de
      coins.
- [ ] L'anneau reste lisible sur les quatre presets de fond, y compris un aplat
      clair.
- [ ] En layout `single`, aucun anneau : il n'y a rien à distinguer.
- [ ] Un export 2× ne contient ni l'anneau ni aucun autre chrome d'édition.
