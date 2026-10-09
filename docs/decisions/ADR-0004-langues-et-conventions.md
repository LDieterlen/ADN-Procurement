# ADR-0004 — Langues, conventions et mode de collaboration
Date : 2026-10-09
Statut : acceptée

## Contexte
Un seul développeur travaille avec Claude Code, avec des réflexes acquis sur deux dépôts : Trône-game (TypeScript, npm, Prettier sans point-virgule, Vitest) et Racoon (Python, uv `native-tls`, ruff, pas de CI). Les règles doivent être écrites une fois, relues par Claude à chaque session, et jamais rediscutées.

## Décision
- Langues : code (identifiants, fichiers, tables, colonnes, commentaires) en anglais ; UI, docs, ADR, JOURNAL, CLAUDE.md et commits en français (défaut appliqué pour CLAUDE.md). Chaînes serveur (erreurs, libellés) dans `api/src/ffe/i18n/fr.py`.
- Commits conventionnels en français (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), un commit par tâche, après `./check.sh` vert.
- Formatage et lint : Prettier `semi: false`, `singleQuote: true`, `printWidth: 160` ; pas d'ESLint ; ruff règles `E9, F, I, UP` ; pyright ; `.editorconfig` et `eol=lf`.
- Pas de CI : `./check.sh` à la racine est la porte avant commit.
- « Pas de code pour plus tard » : dossiers, tables, colonnes et dépendances naissent à leur étape ; les accroches futures sont documentées, pas codées.
- Une étape à la fois ; les décisions d'une étape sont posées en un bloc numéroté avec défaut appliqué si silence ; une décision tranchée se cite (ADR ou JOURNAL) et ne se redemande pas ; une ADR acceptée ne se modifie pas, une nouvelle la remplace.
- `docs/JOURNAL.md` : compte rendu ≤ 10 lignes par session (date, décisions, commit, reste à faire).

## Alternatives écartées
- CLAUDE.md en anglais (comme Racoon) : l'utilisateur relit et corrige plus vite en français ; le code, lui, reste en anglais.
- Biome : proche de Prettier mais s'écarte des réflexes acquis sans gain.
- CI GitHub Actions : coût d'entretien pour un développeur seul ; `./check.sh` suffit.

## Conséquences
CLAUDE.md reprend ces règles dans « Règles dures » et « Collaboration » ; `.claude/settings.json` autorise les vérifications (`pytest`, `ruff`, `tsc`, `vitest run`…), demande confirmation pour installations et restaurations, refuse `rm -rf` et l'accès à `~/.persist/ffe/**`. Toute nouvelle dépendance exige une ligne dans l'ADR concernée.

## Repli
Si une règle gêne : nouvelle ADR qui remplace celle-ci. Un linter TypeScript pourra être ajouté quand typescript-eslint supportera TS 7, par ADR.
