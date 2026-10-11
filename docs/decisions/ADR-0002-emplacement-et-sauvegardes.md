# ADR-0002 — Emplacement du dépôt, des données et sauvegardes
Date : 2026-10-09
Statut : acceptée

## Contexte
Devcontainer WSL2. Vérifié le 2026-10-09 : `/workspaces/Perso` est un montage 9p (drvfs vers `C:\`), `/` est un overlay effacé à chaque reconstruction ; `~/.persist` est le seul ext4 persistant constaté. SQLite en WAL (fichiers `-wal`, `-shm`, verrous) n'est pas fiable sur 9p. Perdre la base est le risque numéro un du projet.

## Décision
- Dépôt git sur `/workspaces/Perso/FFE` (nom sans esperluette, visible et éditable depuis Windows comme les autres dépôts de l'utilisateur).
- Données vivantes sous `FFE_DATA_DIR` : `~/.persist/ffe/` (usage réel) et `~/.persist/ffe-dev/` (développement), contenant `ffe.sqlite`, `files/`, `backups/`, `logs/`, `ffe.lock`. Jamais dans le dépôt, jamais sur 9p ni sur l'overlay.
- Refus de démarrer si le système de fichiers de `FFE_DATA_DIR` n'est pas ext4 (lecture de `/proc/mounts`). Verrou mono-instance `ffe.lock` : un second démarrage est refusé.
- Cycle de démarrage : verrou → `quick_check` → sauvegarde si migrations en attente ou dernière > 24 h → `alembic upgrade head` → `foreign_key_check` → `quick_check`. Tout échec = arrêt sans servir.
- Sauvegarde = `sqlite3.Connection.backup()` (stdlib) vers `backups/tmp`, `quick_check` du fichier produit, puis `rename` dans `backups/` ; nom `ffe-YYYYMMDD-HHMMSS[-label].sqlite`. Jamais de copie à chaud de `ffe.sqlite` (`cp`, `rsync`).
- Rotation (défaut, à confirmer à l'étape 3, D3.2) : 14 quotidiennes, 8 hebdomadaires, 12 mensuelles ; sauvegardes `pre-migrate` conservées 90 jours.
- Copie séquentielle de chaque sauvegarde terminée vers `FFE_BACKUP_DIR`, dossier visible de Windows, défaut `/workspaces/Perso/FFE-sauvegardes/` (hors dépôt ; défaut appliqué, à confirmer par l'utilisateur). Dossier absent : démarrage autorisé, avertissement persistant dans `/api/v1/health` et l'accueil.

## Alternatives écartées
- Dépôt aussi sur `~/.persist/src/ffe` avec lien symbolique depuis `/workspaces` : invisible des outils Windows, rompt l'habitude des autres dépôts.
- Conserver le nom `FF&E` : esperluette hostile aux shells, aux URL et aux outils.
- Base sur 9p ou sur l'overlay, ou copie directe du fichier : corruption possible, perte au rebuild.

## Conséquences
`FFE_DATA_DIR=/workspaces/x` est refusé (testé à l'étape 3) ; sauvegarde automatique avant chaque `upgrade` ; CLI `ffe db backup|restore|check|export-json` ; `.gitignore` exclut `*.sqlite*` ; `.claude/settings.json` refuse la lecture et l'écriture de `~/.persist/ffe/**` (la base de dev `~/.persist/ffe-dev/` reste lisible par Claude ; la base réelle jamais). Timer horaire, copie Windows (vérifiée par `quick_check`, même rotation), sauvegarde à l'arrêt si la base a changé, et `RUNBOOK.md` : livrés à l'étape 9 (2026-10-11).

## Repli
Tout autre dossier ext4 passé en `FFE_DATA_DIR` convient si `~/.persist` change. Restauration par `ffe db restore <fichier>` depuis `backups/` ou `FFE_BACKUP_DIR` : vérifie l'intégrité de la source et sauvegarde la base courante (`pre-restore`) avant remplacement atomique.
