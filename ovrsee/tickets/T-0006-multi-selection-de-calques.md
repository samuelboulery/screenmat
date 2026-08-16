---
{
  "id": "T-0006",
  "titre": "Multi-sélection de calques",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "l",
  "tags": [
    "annotate",
    "canvas"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-annotation-rendu-live-texte-au-clic-couleurs-inver.md",
  "epic": "T-0001"
}
---

## Contexte

La sélection est unitaire (`selectedAnnotationId`) : impossible de déplacer,
supprimer ou grouper plusieurs calques d'un geste. Elle devient
`selectedLayerIds: string[]`, avec `selectLayers(ids, mode)` en
`replace` / `toggle` / `range`.

Le rectangle de sélection reste en DOM : c'est du chrome d'édition, pas de
l'artwork — pas de second chemin de rendu ici.

## Critères d'acceptation

- [ ] ⇧-clic et ⌘-clic sur le canvas ajoutent ou retirent un calque du lot.
- [ ] Glisser sur du vide avec l'outil Select trace un marquee qui sélectionne
      tout ce qu'il croise, masqués et verrouillés exclus.
- [ ] Déplacer, supprimer, dupliquer et nudger s'appliquent à toute la sélection,
      en une seule entrée d'historique par geste.
- [ ] Un cadre par calque sélectionné ; poignées seulement quand la sélection est
      unitaire, avec un commentaire `ponytail:` nommant le plafond.
- [ ] `⌘A` sélectionne tout dans le shot actif, `⌘G` groupe, `⇧⌘G` dégroupe.
- [ ] `Escape` vide la sélection.
