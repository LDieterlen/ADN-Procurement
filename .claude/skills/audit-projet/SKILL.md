---
name: audit-projet
description: Sonde tout le dépôt FFE (api, web, extension, docs) à la recherche de bugs, de code mort, de refactos utiles, d'incohérences (code ↔ docs maîtres, règles dures de CLAUDE.md, nommage, mise en forme) et rend un rapport classé, sans rien modifier. À lancer sur demande (« audit », « sonde le projet », « cherche les bugs et le code mort »).
---

# Audit du projet FFE

But : un état des lieux fiable, **sans modifier le code** (lecture, commandes en lecture seule et tests seulement). Les corrections se font ensuite, à la demande, item par item.

## 0. Préparer

1. Lire `CLAUDE.md` (règles dures), `docs/ROADMAP.md`, la fin de `docs/JOURNAL.md`, la liste `docs/decisions/` : ce sont les références de l'audit.
2. Noter l'état : `git status --short`, `git log --oneline -5`.
3. Lancer la porte : `./check.sh` (ruff, pyright, pytest, tsc, prettier, vitest). Un échec est le premier constat. Ne pas lancer `npm run e2e` (lent) sauf demande.
4. Jamais toucher `~/.persist/ffe/` (base réelle) ; ne jamais arrêter le `ffe serve` ni le `npm run dev` de l'utilisatrice ; scripts jetables dans le scratchpad uniquement.

## 1. Sonder, par axes (en parallèle avec des sous-agents quand c'est possible)

Chaque axe rend des constats `{fichier:ligne, catégorie, gravité, constat, scénario concret, correction proposée}`. Un constat sans scénario concret ou sans preuve (ligne citée, commande rejouable) est écarté.

- **Bugs — API** (`api/src/ffe/`) : transactions (toute écriture dans `with session.begin()`, jamais deux transactions imbriquées), journal `project_item_event` écrit à chaque changement de statut / prix / implantation, calculs hors `money.py`, floats sur des montants, 500 silencieux, erreurs non typées, messages en dur hors `i18n/fr.py`, cas limites des codes (ADR-0018/0021 : tassement avant le premier indice, plus petit numéro libre après), options (ADR-0021), `save_item` tout ou rien.
- **Bugs — base** : modèles ↔ migrations (`alembic check`), migrations additives après la v1 (ADR-0020 : `0001_initial.py` figée), CHECK / UNIQUE / FK cohérents avec `docs/DATA_MODEL.md`, colonnes nullables dans un UNIQUE sans `WHERE`.
- **Bugs — web** (`web/src/`) : états non gérés (chargement, erreur, vide), mutations sans invalidation, `any` / `enum` / types API écrits à la main, front qui additionne ou calcule un montant, appels hors `api/queries`, brouillon de la page article (perte de saisie, `useBlocker`).
- **Code mort** : fonctions, composants, routes, exports, messages `fr.py`, clés CSS, colonnes ou tables jamais lues (ex. `item_code_sequence`, gardée volontairement par ADR-0021 : à signaler comme « conservé », pas comme défaut), dépendances `pyproject.toml` / `package.json` inutilisées, fichiers orphelins. Prouver chaque cas par un `grep` sans résultat.
- **Refactos utiles** : duplication réelle (même logique à deux endroits), fonctions trop longues ou à double responsabilité, composants qui réimplémentent `components/forms/*`, `DataTable`, `TableCard`, `ListToolbar`. Seulement ce qui réduit un risque ou du code ; pas de goût personnel.
- **Incohérences** : docs maîtres ↔ code (`DATA_MODEL.md` tables et colonnes, `API.md` routes ↔ `api/openapi.json`, `ARCHITECTURE.md` arborescence et commandes, carte du code et nombre de tables dans `CLAUDE.md`), ADR contredites par le code, libellés français incohérents entre écrans, langue (code en anglais, UI et docs en français), nommage (un module par table, singulier), commentaires périmés.
- **Mise en forme** : sortie de `ruff format --check`, `prettier --check`, styles et tokens Tailwind (`styles.css`) contournés par des couleurs en dur, tailles de contrôles disparates (`control`, `Button` sizes).
- **Sécurité et règles locales** : écoute `127.0.0.1` seulement, seul accès sortant `Deps.fetch_url`, CORS de l'extension limité, jeton `X-FFE-Token`, aucune donnée de `references/` ni fichier `.sqlite` suivi par git.

## 2. Vérifier

Pour chaque constat retenu, une seconde lecture adversariale : relire le code autour, chercher la garde qui l'empêcherait, rejouer si possible (test ciblé, requête sur une base jetable sous `~/.persist/.ffe-tests/`). Garder `CONFIRMÉ` ou `PLAUSIBLE`, écarter le reste.

## 3. Rendre le rapport

En français, sobre, classé du plus grave au moins grave :

1. **Porte** : résultat de `./check.sh`.
2. **Bugs** (confirmés puis plausibles), avec scénario et correction proposée.
3. **Incohérences** docs ↔ code ↔ règles.
4. **Code mort**.
5. **Refactos** proposées (gain attendu).
6. **Mise en forme**.
7. **Rien à signaler** sur les axes propres, pour montrer qu'ils ont été sondés.

Terminer par une proposition d'ordre de correction (lots courts) et rappeler que rien n'a été modifié. Ne corriger qu'à la demande ; chaque correction suit alors les règles de `CLAUDE.md` (phase de conception : retouche + vérification ciblée ; commit seulement sur demande, porte verte).
