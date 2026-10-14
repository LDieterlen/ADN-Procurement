# ADR-0020 — Déclaration de la v1 : schéma figé, migrations additives
Date : 2026-10-14
Statut : acceptée
## Contexte
Une base réelle vit désormais sur le Mac de l'utilisatrice (ADR-0019), créée depuis la branche `mac` au commit `62c4d14`, révision `0001`. Avant la v1, ADR-0012 régénère `0001_initial.py` à chaque changement de schéma : sur cette base, une mise à jour ferait « rien à migrer », puis l'arrêt du démarrage (schéma en retard, étape 8). Exigence de l'utilisateur (2026-10-14) : une mise à jour ne doit jamais rien perdre.
## Décision
- **La v1 est déclarée** : `0001_initial.py` (sha256 `8373fb05…02ab42`, 19 tables) est figée ; la clause « schéma repris de zéro jusqu'à la v1 » d'ADR-0012 prend fin.
- Tout changement de schéma = une migration nouvelle `NNNN_<objet>.py` (`0002_…`), autogénérée puis **relue ligne à ligne**, **additive seulement** : table nouvelle, `ADD COLUMN` nullable ou avec défaut, index ; jamais de suppression ni de renommage de table ou de colonne, jamais d'édition d'une migration publiée. Une valeur requise sur des lignes existantes se remplit dans la même migration (`UPDATE`).
- Garde-fous : `tests/test_v1_upgrade.py` — empreinte de `0001_initial.py` ; base témoin `tests/fixtures/v1_demo.sql` (schéma `0001`, 21 types, projet d'exemple ; figée, jamais régénérée) chargée en base réelle puis démarrée : chaque ligne et chaque colonne de la v1 doivent survivre à toutes les migrations.
- Au démarrage, après `upgrade` : si une table a moins de lignes qu'avant, arrêt sans servir, avec le nom de la sauvegarde `pre-migrate` à restaurer (`db/startup.py`).
- La base de dev garde sa recréation automatique sur écart de schéma ; `alembic check` (pytest) refuse un modèle sans migration.
- L'utilisatrice ne met à jour que depuis la branche `mac`, avancée seulement avec une porte verte.
## Alternatives écartées
- Rester avant la v1 et migrer sa base à la main à chaque changement : risque d'erreur, dépendance à une intervention.
- Export JSON puis réimport à chaque mise à jour : l'import ne restaure pas les fichiers et suppose le même schéma.
## Conséquences
CLAUDE.md, ARCHITECTURE §5 et la notice Mac (§12) passent au régime v1. Une retouche qui touche le schéma coûte une migration relue et son cas dans la base témoin si elle remplit des données.
## Repli
Aucun retour à la régénération tant qu'une base réelle existe ; une erreur de migration se corrige par une migration suivante, la base se restaure depuis `pre-migrate-<rev>`.
