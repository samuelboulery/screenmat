---
{
  "status": "open",
  "title": "Commiter le jeu d'icônes unifié",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# Commiter le jeu d'icônes unifié

## Contexte

Le travail de la session est terminé et vérifié (`tsc -b`, 109 tests, `pnpm build`,
parcours cliqué sur les six écrans) mais rien n'est commité. 25 fichiers modifiés,
9 nouveaux, 1 supprimé — 488 insertions, 345 suppressions.

Branche courante : `feat/annotations-completes` (pas la branche par défaut, donc
rien à créer). Pas de remote à pousser dans cette demande : commit seulement.

## Un seul commit

Tout relève du même changement : le jeu d'icônes, la passe de design qui
l'accompagne, la doc qui devient vraie, et les artefacts ovrsee qui le décrivent.
Le découper donnerait des commits qui ne compilent pas isolément (le socle sans
les appelants, ou l'inverse).

Contenu :

- `src/components/icons.tsx` (nouveau) — seul point d'entrée Lucide.
- `src/components/ui.tsx` — `IconButton`, paddings de `Button`, rayons.
- Les 13 composants d'écran et de panneau — icônes + balayage des rayons.
- `src/index.css` — règle `.lucide`, tokens `--radius-*`.
- `src/components/LayoutIcon.tsx` — supprimé.
- `package.json` + `pnpm-lock.yaml` — `lucide-react@^1.31.0`.
- `CLAUDE.md`, `.claude/rules/shotframe-conventions.md` — la ligne « zéro
  dépendance runtime » et l'interdiction des libs UI disaient désormais faux.
- `ovrsee/` — plan capturé, 7 tickets (T-0009 epic + 6 enfants), `.active-plan`.

**Effet de bord voulu :** le hook `ovrsee-post-commit.js` bascule en colonne
finale les tickets en vol. Les sept sont en « en cours » et le travail a
effectivement atterri, donc c'est le bon résultat.

## Message

Conventional Commits en français, corps en prose comme les trois commits
précédents, aucun trailer d'attribution (aucun commit du dépôt n'en porte).

```
feat: jeu d'icônes unifié et passe de design

Trois langages visuels cohabitaient : les abréviations mono du rail
(FRM, BG, SEL…), des glyphes Unicode détournés en icônes (↺, ◉, ⊘, ↖)
et des micro-icônes dessinées en CSS. Le commentaire en tête du ToolRail
posait le dilemme sans le trancher — « toutes ou aucune ». C'est toutes.

lucide-react entre comme seule dépendance runtime hors React, bundlée :
la contrainte hors ligne tient. Un seul fichier l'importe,
src/components/icons.tsx, qui porte les tables de mapping. La taille et
l'épaisseur du trait sont réglées une fois en CSS sur la classe .lucide
plutôt que répétées sur soixante appels — le 2 px par défaut de Lucide
écraserait une DA dont les filets font 1 px.

IconButton exige une prop label qui alimente title et aria-label : un
bouton icône-seule muet n'est plus écrivable. Il remplace les trois
styles ad hoc et fait disparaître la collision entre le Toggle local de
LayersPanel et l'interrupteur de ui.tsx.

Passe de design dans le même mouvement : seize rayons ramenés à cinq
tokens, une seule opacité de disabled, paddings de Button alignés, cases
toutes à 40 px, gaps et paddings remis sur l'échelle.

Deux corrections venues de l'écran et non du plan : SendToBack et
BringToFront sont deux carrés indiscernables à 16 px et passent en
flèches ; la barre haute débordait à 1052 px une fois les icônes
posées, les mots des onglets tombent donc sous 1180 px.

LayoutIcon.tsx disparaît — ses rectangles CSS portaient un #8B8FA0 hors
tokens. Les raccourcis clavier (⌘V, ⌫) et les ratios restent en texte :
ça se lit, ça ne se dessine pas.
```

## Vérification

```bash
git add -A                # inclut la suppression de LayoutIcon.tsx
git status --short        # relire ce qui part avant de commiter
git commit -F <message>
git show --stat HEAD      # 25 modifiés, 9 nouveaux, 1 supprimé
git log --oneline -3
```

Puis relire `ovrsee/tickets/` : les sept tickets doivent être passés en colonne
finale par le hook post-commit. S'ils ne bougent pas, les déplacer à la main
(`colonne` + `maj`) plutôt que de recommiter.
