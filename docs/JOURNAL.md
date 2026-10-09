# Journal des sessions

Un paragraphe par session, du plus récent au plus ancien. Contenu fixe : **date**, **étape**, **décisions** numérotées `D<étape>.<n>` avec la réponse (ou « défaut » si appliqué par silence, « défaut, à confirmer » si l'utilisateur ne s'est pas encore prononcé), **commits** (message, hash), **reste** (à vérifier par l'utilisateur, parqué, reporté). Dix lignes maximum par session hors listes de décisions. Une décision inscrite ici ne se redemande pas : elle se cite. Une décision structurante va aussi dans `docs/decisions/`.

---

## 2026-10-09 — Étape 0 : outils de travail

**Fait** : dépôt `/workspaces/Perso/FFE` créé (l'ancien dossier `FF&E`, vide, reste à supprimer par l'utilisateur : `rmdir "/workspaces/Perso/FF&E"` ; puis rouvrir VS Code / Claude Code sur `FFE`), git initialisé sur `main`, documentation et configuration de collaboration écrites. Aucun code applicatif. Plan de l'étape 0 approuvé par l'utilisateur après une conception multi-agents (3 recherches, 3 stacks jugées, 3 livrables critiqués puis révisés) ; matière conservée sous `~/.persist/claude/projects/-workspaces-Perso-FF-E/…/subagents/workflows/wf_adc0dbc8-2df/journal.jsonl`.

**Cadrage validé avec l'utilisateur** (voir ADR-0001 à ADR-0005) :

- D0.1 Stack : back Python (FastAPI, SQLAlchemy 2.0.x, Alembic batch, Pydantic v2, Typer, uv) + front TypeScript (Vite 8, React 19, TS 7, TanStack Query, react-router, react-hook-form, Tailwind 4, openapi-fetch). Choisi par l'utilisateur contre un TS unique mieux noté, pour la couche migrations. — ADR-0001.
- D0.2 Emplacement : dépôt `/workspaces/Perso/FFE` (9p, visible de Windows) ; base SQLite, fichiers joints, sauvegardes vivantes sur `~/.persist/ffe/` (ext4 persistant, vérifié) ; copies vers un dossier Windows. — ADR-0002.
- D0.3 Métier : résidentiel et hôtellerie ; une zone porte un multiplicateur (défaut 1). — ADR-0005.
- D0.4 Placements : une ligne peut être placée dans plusieurs zones avec une quantité par zone (`project_item_placement`). — ADR-0005.
- D0.5 Périmètre v1 : prescription et budget (étapes 1 à 9). Devis, commandes, livraisons, factures : structure prête, livrés à l'étape 10.
- D0.6 Prix : HT saisi + taux de TVA → TTC calculé ; plusieurs devises (devise et `fx_rate_micro` figés par ligne, totaux en EUR) ; remises fournisseur en points de base. — ADR-0003, ADR-0005.
- D0.7 Marge de revente : information inconnue de l'utilisateur à ce jour → aucune colonne de vente en v1 ; chemin additif (`markup_bp`, `unit_sell_override_cents`, `setting.pricing_mode`) documenté dans ADR-0005 et DATA_MODEL §9 (ROADMAP « Reporté volontairement » y renvoie).
- D0.8 Langues : code, tables, colonnes, fichiers en anglais ; UI, docs, CLAUDE.md, commits en français. — ADR-0004.

**Défauts appliqués** (silence de l'utilisateur, chacun **défaut, à confirmer**) :

- D0.9 Catégories de départ : AS assises, TAB tables, RAN rangements, LIT literie, LUM luminaires, TXT textiles, DEC décoration, CUI cuisine, SAN sanitaire, MEN menuiserie, EQU équipement, FRA frais, DIV divers ; codes articles sur le niveau 1 (`LUM-003`). — défaut, à confirmer.
- D0.10 Dossier Windows de sauvegarde `FFE_BACKUP_DIR` = `/workspaces/Perso/FFE-sauvegardes/` (hors dépôt). — défaut, à confirmer.
- D0.11 Frais (transport, installation) : lignes forfaitaires `kind='fee'` par fournisseur, exclues du book. — défaut, à confirmer.
- D0.12 Dirigeants d'entreprise : jamais stockés lors de la future recherche d'entreprises (F3). — défaut, à confirmer.
- D0.13 CLAUDE.md rédigé en français. — défaut, à confirmer.
- D0.14 Options A/B présentées au client : hors v1, chemin additif `project_item.alternative_of_id`. — défaut, à confirmer.
- D0.15 SQLAlchemy 2.0.x au départ (2.1 plus tard), pas de SQLModel, tables STRICT, pas de CI. — défaut, à confirmer.
- D0.16 Schedules Excel existants à partager pour l'import futur (F4) : aucun fourni. — facultatif, ouvert.

**Fichiers créés** : `.gitignore`, `.gitattributes`, `.editorconfig`, `check.sh`, `.claude/settings.json`, `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` (brouillon, à valider à l'étape 2), `docs/API.md`, `docs/ROADMAP.md`, `docs/GLOSSARY.md`, `docs/JOURNAL.md`, `docs/decisions/README.md`, `docs/decisions/ADR-0001-stack.md`, `ADR-0002-emplacement-et-sauvegardes.md`, `ADR-0003-argent-dates-identifiants.md`, `ADR-0004-langues-et-conventions.md`, `ADR-0005-lignes-placements-prix.md`.

**Commits** : `chore: initialisation du dépôt` (commit initial de `main`, un seul pour l'étape 0 ; son hash est le premier de `git log`).

**À vérifier par l'utilisateur** (5 min) : la liste de vérification du plan (fichiers présents, un commit, ADR ≤ 25 lignes et approuvées, aucun fichier de code) ; relire les cinq ADR et les défauts D0.9 à D0.15 ; rouvrir VS Code / Claude Code sur `/workspaces/Perso/FFE`.

**Reste** : réponses aux défauts D0.9 à D0.16. Mémoire Claude Code posée (profil, cadrage, collaboration) pour les deux chemins de projet (`FF&E` et `FFE`).

**Prochaine étape : 1 — Squelette outillage.** Décisions à poser en bloc en début de session : D1.1 ports 8000 (API) / 5173 (Vite) ; D1.2 SQLAlchemy 2.0.x, pas 2.1 ; D1.3 Tailwind dès maintenant ; D1.4 uv `native-tls = true` ; D1.5 instantané `api/openapi.json` commité par `ffe openapi`, source de `gen:api` (défaut, à confirmer à l'étape 1). Défauts : oui aux cinq. Critère de fini : `./check.sh` vert, « API OK » affiché depuis le navigateur Windows, test de fraîcheur de `schema.d.ts` qui échoue quand une route change.
