# FFE — outil de procurement FF&E

Outil **local et mono-utilisateur** pour prescrire, chiffrer et suivre le mobilier, les luminaires et les équipements (FF&E) d'un projet d'aménagement intérieur, en résidentiel comme en hôtellerie. Il remplace les tableurs de *schedule* : un référentiel réutilisable (clients, fournisseurs, produits, fichiers, annuaire de professionnels), des projets découpés en zones (avec multiplicateur, par exemple « Chambre A × 12 »), des lignes de spécification placées dans une ou plusieurs zones, des prix figés en plusieurs devises (totaux en EUR), des statuts suivis de la prescription à l'installation, et des budgets par zone ou catégorie.

Il s'adresse à un architecte d'intérieur ou décorateur qui gère seul ses projets et veut un outil fiable, simple, qui tourne sur sa machine sans dépendre d'un service en ligne.

## État

**Au 2026-10-11 : étapes 1 à 10c, F1, F2 et F4 livrées** — référentiel, produits et fichiers, projets et zones, lignes avec placements et statuts, budgets et tableau de bord, sauvegardes et réglages, devis, bons de commande, réceptions et factures, exports xlsx et PDF, import de tarifs. Restent F3 (registre d'entreprises), F5 (coller une URL) et F6 (extension navigateur). Détail et décisions : [`docs/ROADMAP.md`](docs/ROADMAP.md) et [`docs/JOURNAL.md`](docs/JOURNAL.md).

## Architecture (3 couches)

1. **Base** : SQLite (WAL, tables STRICT, contraintes CHECK/UNIQUE/FK dans la base), migrations Alembic relues et sauvegarde automatique avant chaque migration.
2. **API** : Python 3.14, FastAPI + SQLAlchemy 2.0 + Pydantic v2, CLI Typer (`ffe`), à l'écoute de `127.0.0.1:8000` seulement ; tous les calculs d'argent dans un seul module, en entiers (centimes).
3. **Front** : Vite + React 19 + TypeScript strict, TanStack Query, react-hook-form, Tailwind ; client typé généré depuis l'OpenAPI de l'API ; aucun appel externe.
4. Un dépôt, deux sous-projets : `api/` (uv) et `web/` (npm). `./check.sh` à la racine lance toutes les vérifications.
5. Priorités : fiabilité, puis simplicité. Code en anglais ; interface, docs et commits en français.

## Emplacement des données

Le dépôt vit sur `/workspaces/Perso/FFE` (montage 9p, vu depuis Windows). Les données vivantes ne s'y trouvent **jamais** : base, fichiers joints, sauvegardes et journaux sont sous `~/.persist/ffe/` (usage réel) ou `~/.persist/ffe-dev/` (développement), seul disque ext4 persistant du devcontainer. Une copie des sauvegardes est recopiée vers un dossier visible de Windows (`FFE_BACKUP_DIR`, défaut `/workspaces/Perso/FFE-sauvegardes/`). Voir `docs/decisions/ADR-0002-emplacement-et-sauvegardes.md`.

## Lancer

Pré-requis : `uv` ≥ 0.12 et Node 24. Toutes les commandes se tapent dans le terminal du devcontainer, depuis la racine du dépôt.

```bash
# Première fois (ou après reconstruction du devcontainer)
mkdir -p ~/.venvs && ln -sfn ~/.venvs/ffe api/.venv   # venv Python sur ext4, pas sur le montage 9p
(cd api && uv sync)                                   # dépendances Python
(cd web && npm ci)                                    # dépendances front
(cd api && uv run ffe db migrate && uv run ffe db seed --demo)   # base de dev (~/.persist/ffe-dev) + 19 types de produit + projet d'exemple

# Développement : deux terminaux
(cd api && uv run ffe serve --reload)   # API sur http://127.0.0.1:8000
(cd web && npm run dev)                 # interface sur http://localhost:5180 (ouvrir depuis Windows)

# Usage réel (base ~/.persist/ffe) : construire le front, puis servir le tout sur un seul port
(cd web && npm run build)
(cd api && uv run ffe db migrate --prod && uv run ffe db seed --prod)   # une fois (sans --demo)
(cd api && uv run ffe serve --prod)     # interface + API sur http://127.0.0.1:8000

# Base de données (serveur arrêté) ; sans --prod, la base de dev
(cd api && uv run ffe db backup --with-files)      # sauvegarde + copie vérifiée vers FFE_BACKUP_DIR
(cd api && uv run ffe db restore <fichier.sqlite>) # restauration (sauvegarde « pre-restore » automatique)
(cd api && uv run ffe db check --files)            # intégrité, comptages, orphelins, sha256 des fichiers
(cd api && uv run ffe db export-json export.json --with-files)   # copie lisible + fichiers joints

# Schéma modifié avant la v1 (ADR-0012) : la base de dev se recrée, rien n'y est précieux
rm -f ~/.persist/ffe-dev/ffe.sqlite ~/.persist/ffe-dev/ffe.sqlite-wal ~/.persist/ffe-dev/ffe.sqlite-shm
(cd api && uv run ffe db migrate && uv run ffe db seed --demo)

# Vérifications
./check.sh                 # ruff, pyright, pytest, tsc, prettier, vitest : la porte avant tout commit
(cd web && npm run e2e)    # deux parcours Playwright sur une API jetable (après `npm run e2e:install`)
```

Dossier de copie Windows des sauvegardes : `/workspaces/Perso/FFE-sauvegardes/` par défaut (variable `FFE_BACKUP_DIR`), à créer une fois ; la page Réglages signale s'il manque. Procédures en cas de problème : [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Documentation

| Document | Contenu |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Guide de travail pour Claude Code : commandes, règles dures, carte du code, collaboration |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Les trois couches, flux d'une requête, cycle de démarrage, frontières, checklist « ajouter une ressource », points d'extension |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Modèle de données table par table, diagramme, statuts, formules de calcul, accroches futures (brouillon validé à l'étape 2) |
| [`docs/API.md`](docs/API.md) | Conventions de l'API `/api/v1` : JSON camelCase, format d'erreur, codes HTTP ; tableau des routes à partir de l'étape 4 |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Feuille de route étape par étape, critères de fini, idées parquées |
| [`docs/GLOSSARY.md`](docs/GLOSSARY.md) | Vocabulaire métier FR/EN (FF&E, OS&E, schedule, book, lead time, placement, multiplicateur…) relié aux noms de tables |
| [`docs/JOURNAL.md`](docs/JOURNAL.md) | Journal des sessions : date, décisions prises, commits, reste à faire |
| [`docs/decisions/`](docs/decisions/) | Décisions d'architecture, ADR-0001 à 0011 (stack, emplacement et sauvegardes, argent, langues, lignes et prix, devis, bons de commande, réceptions et factures, exports xlsx et PDF, import de tarifs) |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Procédures : base corrompue, disque plein, migration échouée, verrou, devcontainer reconstruit, prix faux validé |

## Feuille de route

- **Étapes 1 à 5** : squelette `api/` + `web/`, modèle de données validé, infrastructure base (pragmas, verrou, migrations, sauvegardes), première ressource `client` de bout en bout (API puis interface).
- **Étapes 6 à 9** : référentiel (fournisseurs, fabricants, catégories), produits et fichiers, projets et zones, lignes de spécification avec placements, statuts et historique, budgets et tableau de bord, polish fiabilité.
- **Étape 10 et suivantes** : achats (devis, commandes, réceptions, factures), exports xlsx/PDF, recherche d'entreprises, import de tarifs fournisseurs, capture de produits par URL et extension navigateur.
