---
{
  "id": "T-0039",
  "titre": "Appliquer un vieux style noircit le canvas",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "s",
  "tags": [
    "bug",
    "styles",
    "render"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-rendre-les-styles-editables-et-supprimables.md"
}
---

## Contexte

Cliquer un style enregistré avant l'arrivée de `saturation`/`contrast`
(T-0018) éteignait l'écran : `apply()` faisait `setSettings(style.settings)`
sans contrôle, l'`undefined` traversait le calcul de couleur du fond, et
`drawBlobs` (`lib/background.ts:111`) recevait `rgba(NaN, NaN, NaN, 0.75)`.
`addColorStop` jette, `renderScene` s'interrompt, le canvas reste noir — et le
reste dorénavant, chaque frame rejouant la même exception.

Reproduit en écrivant un style sans ces deux champs dans IndexedDB, puis en le
cliquant : canvas noir, quatre exceptions par seconde.

`parseSettings` (`lib/styles.ts`) faisait déjà exactement le bon travail, mais
n'était appliqué qu'aux `.json` importés. IndexedDB est une frontière comme une
autre : ce qu'on en relit a été écrit par une version antérieure de l'app.

## Critères d'acceptation

- [ ] Un style dépourvu d'un réglage ajouté depuis s'applique sans exception, en
      retombant sur la valeur par défaut du champ manquant.
- [ ] Une palette figée illisible est écartée plutôt que propagée au rendu.
- [ ] Un test couvre les deux cas dans `src/lib/__tests__/styles.test.ts`.
