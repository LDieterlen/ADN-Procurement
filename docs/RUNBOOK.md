# RUNBOOK — procédures d'exploitation

Procédures à suivre quand quelque chose casse. Maîtres cités : cycle de démarrage, pragmas et sauvegardes dans `ARCHITECTURE.md` §5 ; emplacements et variables dans `ARCHITECTURE.md` §1 ; décisions dans `decisions/ADR-0002`. Toutes les commandes se lancent depuis `api/` ; sans `--prod`, elles visent la base de **dev** (`~/.persist/ffe-dev`). Ajouter `--prod` pour la base réelle (`~/.persist/ffe`).

Règle commune : **le serveur doit être arrêté** avant `restore`, `import-json --replace` et toute manipulation de fichier (le verrou `ffe.lock` l'impose). Ne jamais copier `ffe.sqlite` à chaud (`cp`, explorateur Windows) : seules les sauvegardes produites par `ffe db backup` sont cohérentes.

## 1. Base corrompue (« quick_check » refusé au démarrage)

Symptôme : `ffe serve` s'arrête avec `FFE : démarrage refusé — quick_check au démarrage : …`.

1. Ne rien modifier dans le dossier de données. Noter le message.
2. `uv run ffe db check --prod` : `integrity_check` détaille le problème (lecture seule).
3. Choisir la sauvegarde la plus récente : `ls -t ~/.persist/ffe/backups/` ou, si le dossier local est perdu, la copie Windows `FFE_BACKUP_DIR` (`/workspaces/Perso/FFE-sauvegardes/`).
4. `uv run ffe db restore <fichier.sqlite> --prod` : vérifie la source (`quick_check`), garde l'ancienne base en `backups/ffe-…-pre-restore.sqlite`, remplace atomiquement.
5. `uv run ffe db check --prod --files` puis `uv run ffe serve --prod`. Les fichiers joints (`files/`) ne sont pas dans la base : ils sont intacts sauf perte du dossier (§5).
6. Ressaisir ce qui a été fait depuis la date de la sauvegarde (l'heure est dans le nom du fichier).

Critère de fini de l'étape 9, rejouable : supprimer `ffe.sqlite` (serveur arrêté), `ffe db restore <dernière>`, relancer → tout revient.

## 2. Disque plein

Symptôme : 500 à l'écriture (`disk I/O error`, `database or disk is full`) dans `logs/ffe.log`, sauvegarde refusée.

1. Arrêter le serveur. Libérer de la place **hors** du dossier de données d'abord (`~/.persist` partage le disque du conteneur).
2. Si besoin, supprimer des sauvegardes locales anciennes dans `backups/` (jamais `ffe.sqlite`, `-wal`, `-shm`, `files/`) : la rotation en garde 14 quotidiennes, 8 hebdomadaires, 12 mensuelles ; les plus vieilles mensuelles partent en premier.
3. Relancer : le cycle de démarrage rejoue `quick_check` ; en cas de refus, §1.

## 3. Migration échouée

Symptôme : `ffe db migrate` ou le démarrage s'arrête après « Sauvegarde : …pre-migrate-00NN… ».

1. La base n'a pas été servie ; la sauvegarde `pre-migrate-00NN` est l'état d'avant.
2. Lire le message (contrainte violée, table existante…). Corriger le code ou les données, jamais une migration déjà appliquée ailleurs.
3. Pour revenir en arrière : `uv run ffe db restore backups/ffe-…-pre-migrate-00NN.sqlite`.
4. Rejouer `uv run ffe db migrate` ; `alembic check` en tests garantit que modèles et migrations coïncident.

## 4. Verrou orphelin

Symptôme : `démarrage refusé — … ffe.lock …` alors qu'aucun serveur ne tourne.

1. Vérifier : `pgrep -af "ffe serve"` (ou `ps aux | grep uvicorn`). S'il reste un processus, l'arrêter proprement (`kill <pid>`, pas `-9` : l'arrêt déclenche la sauvegarde si la base a changé).
2. Si aucun processus : le verrou est un `flock` libéré par le noyau à la mort du processus ; un fichier `ffe.lock` restant est normal et inoffensif. Si le refus persiste, c'est qu'un processus le tient encore (conteneur précédent, terminal oublié) : le trouver avant de toucher au fichier.
3. Ne jamais supprimer `ffe.lock` pendant qu'un serveur tourne.

## 5. Devcontainer reconstruit

Ce qui survit : `~/.persist` (base, fichiers, sauvegardes, logs), le dépôt sur `/workspaces`, `FFE_BACKUP_DIR` sur le disque Windows. Ce qui est perdu : le venv (`~/.venvs/ffe`), `node_modules`, les navigateurs Playwright hors `~/.persist`.

1. `cd api && uv sync` (le lien `api/.venv` → `~/.venvs/ffe` est recréé si besoin), `cd web && npm ci`.
2. `uv run ffe db check --prod --files` : révision, intégrité, orphelins, sha256 des fichiers.
3. `uv run ffe serve --prod` ; page Santé : dernière sauvegarde, dossier Windows accessible.
4. Si `~/.persist` lui-même a disparu : recréer `~/.persist/ffe/`, `uv run ffe db restore <copie Windows> --prod`, recopier `FFE_BACKUP_DIR/files/` dans `~/.persist/ffe/files/` (copie faite par `ffe db backup --with-files`), puis `check --files`.
5. Playwright : `cd web && npm run e2e:install` (navigateurs sous `~/.persist/ms-playwright`, conservés).

## 6. Prix faux validé

Symptôme : une ligne en `approved` ou au-delà porte un prix erroné (saisie ou devis).

1. Ne pas « réparer » en base. Ouvrir la ligne, corriger le prix (ou la remise, le taux) : à partir de `approved`, chaque changement écrit un événement `price`/`fx` avec l'ancienne et la nouvelle valeur (DATA_MODEL §4.13) ; le snapshot `approved_*` reste ce que le client a vu.
2. Si le client doit revalider : repasser la ligne en `quoted` avec une note (confirmation demandée), puis `approved` à nouveau : le snapshot est repris.
3. Si la ligne est déjà `ordered` : pas de retour ; annuler avec note et recréer, ou corriger le prix en place (journalisé) si la commande elle-même est juste.
4. L'historique de la ligne (panneau « Historique ») est la trace ; `ffe db export-json` en donne une copie lisible.

## 7. Journal et vérifications courantes

- `logs/ffe.log` : une ligne par requête (`GET /api/v1/… 200 12ms`) et chaque 500 avec sa trace ; deux fichiers de 5 Mo en rotation.
- Page Réglages : dernière sauvegarde, dernier `quick_check`, dossier Windows, « Sauvegarder maintenant ».
- Sauvegarde automatique : au démarrage (si > 24 h ou migration en attente), chaque heure (règle 24 h), à l'arrêt (si la base a changé depuis la dernière), avant `migrate`, `restore`, `import-json --replace` ; chaque sauvegarde est copiée dans `FFE_BACKUP_DIR` puis vérifiée (`quick_check` de la copie), avec la même rotation.
