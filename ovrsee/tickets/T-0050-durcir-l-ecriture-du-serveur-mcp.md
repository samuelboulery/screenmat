---
{
  "id": "T-0050",
  "titre": "Durcir l'écriture du serveur MCP",
  "colonne": "en-cours",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "securite",
    "cli"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-audit-global-shotframe-constats-et-plan-de-correction.md"
}
---

## Contexte

`cli/mcp.ts:117` résout `args.output` puis appelle `writeFile` : le chemin est
choisi par un modèle distant, et l'écriture écrase silencieusement ce qui s'y
trouve. C'est la seule vraie frontière de confiance du projet — le CLI, lui,
écrit où on lui dit, et c'est son contrat.

Le contenu écrit est une PNG rendue : le risque n'est pas l'exécution de code,
c'est la destruction d'un fichier existant par un modèle qui se trompe de
chemin.

## Critères d'acceptation

- [ ] `ROOT = resolve(process.env.SHOTFRAME_OUT ?? dirname(<premier input>))`.
      Un `output` résolu hors de `ROOT` fait échouer l'appel avec un message
      qui nomme la racine, et **aucun fichier n'est créé**.
- [ ] `writeFile` en `flag: 'wx'` : jamais d'écrasement. Sur `EEXIST`, le
      chemin est suffixé `-2`, `-3`… et c'est le chemin réellement écrit qui
      revient dans le JSON de retour.
- [ ] Rendre deux fois le même screenshot sans passer `output` reste un geste
      normal : le second appel produit `…-shotframe-2.png`.
- [ ] `cli/main.ts` est inchangé — `--out` continue d'écrire où on lui dit.
- [ ] `cli/README.md` dit en une ligne le périmètre d'écriture du MCP et le
      rôle de `SHOTFRAME_OUT`.
