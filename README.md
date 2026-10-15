# FFE — outil de procurement FF&E

Outil **local et mono-utilisateur** pour prescrire, chiffrer et suivre le mobilier, les luminaires et les équipements (FF&E) d'un projet d'aménagement intérieur, en résidentiel comme en hôtellerie. Il remplace les tableurs de *schedule* : un référentiel réutilisable (clients, fournisseurs, annuaire de professionnels), des projets découpés en localisations (avec zone, niveau et multiplicateur, par exemple « Chambre typo A × 12 »), des articles qui portent leur fiche complète et sont implantés dans une ou plusieurs localisations (un code FF&E par implantation), des options A/B, des prix figés en plusieurs devises (totaux en EUR HT), un statut unique de « à chiffrer » à « acheté », des budgets par axe (global, localisation, zone, famille, fournisseur), et des fiches de prescription et listings en PDF.

Il s'adresse à un architecte d'intérieur ou décorateur qui gère seul ses projets et veut un outil fiable, simple, qui tourne sur sa machine sans dépendre d'un service en ligne.

## État

**Au 2026-10-15 : v1 déclarée (2026-10-14, ADR-0020)**, en phase de conception par retouches. Livré : référentiel (clients, fournisseurs, annuaire de professionnels, types de produit, listes éditables famille · usage · prestation), projets et localisations, articles avec fiche autonome (ADR-0016), implantations et codes FF&E par implantation (ADR-0018), codes sans trou et options (ADR-0021), statut unique et journal, page article en brouillon enregistrée d'un bloc, indice déclaré sur le projet, budgets par axe et synthèse, fiches et listing PDF, « Coller une adresse » (F5) et extension Chrome (F6, voir [`extension/README.md`](extension/README.md)), sauvegardes et réglages, installation sur Mac (ADR-0019). Recentrage du 2026-10-12 (ADR-0013) : devis, bons de commande, réceptions, factures, exports xlsx et import de tarifs retirés du code (tag git `v0-complet`). Reste F3 (registre d'entreprises). Détail et décisions : [`docs/ROADMAP.md`](docs/ROADMAP.md) et [`docs/JOURNAL.md`](docs/JOURNAL.md).

## Architecture (3 couches)

1. **Base** : SQLite (WAL, tables STRICT, contraintes CHECK/UNIQUE/FK dans la base), migrations Alembic relues et sauvegarde automatique avant chaque migration.
2. **API** : Python 3.14, FastAPI + SQLAlchemy 2.0 + Pydantic v2, CLI Typer (`ffe`), à l'écoute de `127.0.0.1:8000` seulement ; tous les calculs d'argent dans un seul module, en entiers (centimes).
3. **Front** : Vite + React 19 + TypeScript strict, TanStack Query, react-hook-form, Tailwind ; client typé généré depuis l'OpenAPI de l'API ; aucun appel externe.
4. Un dépôt, deux sous-projets : `api/` (uv) et `web/` (npm). `./check.sh` à la racine lance toutes les vérifications.
5. Priorités : fiabilité, puis simplicité. Code en anglais ; interface, docs et commits en français.

## Emplacement des données

Le dépôt vit sur `/workspaces/Perso/FFE` (montage 9p, vu depuis Windows). Les données vivantes ne s'y trouvent **jamais** : base, fichiers joints, sauvegardes et journaux sont sous `~/.persist/ffe/` (usage réel) ou `~/.persist/ffe-dev/` (développement), seul disque ext4 persistant du devcontainer. Une copie des sauvegardes est recopiée vers un dossier visible de Windows (`FFE_BACKUP_DIR`, défaut `/workspaces/Perso/FFE-sauvegardes/`). Voir `docs/decisions/ADR-0002-emplacement-et-sauvegardes.md`.

## Lancer

Sur le Mac de l'utilisatrice (sans paquet, lancé par un double-clic) : [`docs/INSTALL_MAC.md`](docs/INSTALL_MAC.md).


Pré-requis : `uv` ≥ 0.12 et Node 24. Toutes les commandes se tapent dans le terminal du devcontainer, depuis la racine du dépôt.

```bash
# Première fois (ou après reconstruction du devcontainer)
mkdir -p ~/.venvs && ln -sfn ~/.venvs/ffe api/.venv   # venv Python sur ext4, pas sur le montage 9p
(cd api && uv sync)                                   # dépendances Python
(cd web && npm ci)                                    # dépendances front
(cd api && uv run ffe db migrate && uv run ffe db seed --demo)   # base de dev (~/.persist/ffe-dev) + 21 types de produit + projet d'exemple

# Développement : deux terminaux
(cd api && uv run ffe serve --reload)   # API sur http://127.0.0.1:8000 ; un schéma de base de dev différent des modèles la recrée toute seule au démarrage (ADR-0020) (sauvegarde `pre-reset`, types, projet d'exemple, annuaire `references/ANNUAIRE FUSION.csv` si présent) ; à la main : `uv run ffe db reset-dev`
(cd web && npm run dev)                 # interface sur http://localhost:5180 (ouvrir depuis Windows ; Vite écoute sur toutes les interfaces, ARCHITECTURE §1)

# Usage réel (base ~/.persist/ffe) : construire le front, puis servir le tout sur un seul port
(cd web && npm run build)
(cd api && uv run ffe db migrate --prod && uv run ffe db seed --prod)   # une fois (sans --demo)
(cd api && uv run ffe serve --prod)     # interface + API sur http://127.0.0.1:8000

# Base de données (serveur arrêté) ; sans --prod, la base de dev
(cd api && uv run ffe db backup --with-files)      # sauvegarde + copie vérifiée vers FFE_BACKUP_DIR
(cd api && uv run ffe db restore <fichier.sqlite>) # restauration (sauvegarde « pre-restore » automatique)
(cd api && uv run ffe db check --files)            # intégrité, comptages, orphelins, sha256 des fichiers
(cd api && uv run ffe db export-json export.json --with-files)   # copie lisible + fichiers joints

# Schéma modifié (v1 déclarée, ADR-0020) : nouvelle migration additive NNNN_<objet>.py, relue ligne à ligne ;
# la base de dev se recrée seule au prochain `ffe serve` ; la base réelle se migre avec sauvegarde préalable
(cd api && uv run ffe db migrate --prod)

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
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Modèle de données table par table, diagramme, statuts, formules de calcul, accroches futures (v1 déclarée le 2026-10-14) |
| [`docs/API.md`](docs/API.md) | Conventions de l'API `/api/v1` : JSON camelCase, format d'erreur, codes HTTP ; tableau des routes |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Feuille de route étape par étape, critères de fini, idées parquées |
| [`docs/GLOSSARY.md`](docs/GLOSSARY.md) | Vocabulaire métier FR/EN (FF&E, OS&E, schedule, lead time, implantation, option, indice, multiplicateur…) relié aux noms de tables |
| [`docs/JOURNAL.md`](docs/JOURNAL.md) | Journal des sessions : date, décisions prises, commits, reste à faire |
| [`docs/decisions/`](docs/decisions/) | Décisions d'architecture, ADR-0001 à 0021 (index et statuts dans [`docs/decisions/README.md`](docs/decisions/README.md)) |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Procédures : base corrompue, disque plein, migration échouée, verrou, devcontainer reconstruit, prix faux validé |

## Feuille de route

- **Étapes 1 à 11, F1 à F6** : livrées (historique dans `docs/JOURNAL.md`) ; recentrage sur la prescription et le budget à l'étape 12 (ADR-0013), v1 déclarée le 2026-10-14 (ADR-0020).
- **En cours** : phase de conception par retouches (page article, options, listes), consolidation item par item ensuite.
- **Ouvert** : F3 (recherche d'entreprises) et les idées parquées de [`docs/ROADMAP.md`](docs/ROADMAP.md) (achats, exports xlsx, import de tarifs, marge, TVA…).
