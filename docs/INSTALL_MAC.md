# Installer FFE sur un Mac

Notice d'installation sur le Mac de l'utilisatrice, à dérouler à deux (environ 30 minutes, connexion internet nécessaire). Décision et limites : [ADR-0019](decisions/ADR-0019-poste-mac.md). Rien n'est empaqueté : FFE tourne depuis une copie du dépôt, lancée par un double-clic.

## 1. Outils (une fois)

Dans l'app **Terminal** (Applications › Utilitaires), une commande à la fois :

```bash
xcode-select --install          # outils Apple (git) : accepter la fenêtre qui s'ouvre, attendre la fin
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

À la fin, Homebrew affiche deux ou trois lignes « Next steps » (`echo … >> ~/.zprofile`, `eval …`) : **les copier-coller telles quelles**, puis fermer et rouvrir le Terminal.

```bash
brew install uv node@24 pango   # uv : Python et dépendances ; node : construire l'interface ; pango : PDF
brew link --force node@24
```

Google Chrome doit être installé (pour l'extension « Envoyer à FFE »).

## 2. FFE (une fois)

```bash
git clone https://github.com/LDieterlen/ADN-Procurement.git ~/FFE   # dépôt privé : se connecter à GitHub
cd ~/FFE
git switch mac                                    # tant que la branche mac n'est pas fusionnée dans main
(cd api && uv sync)                               # installe Python 3.14 et les dépendances
(cd web && npm ci && npm run build)               # construit l'interface (servie ensuite par l'API)
(cd api && uv run ffe db migrate --prod && uv run ffe db seed --prod)   # base réelle ~/.persist/ffe + types de produit
```

Annuaire de l'agence (facultatif) : `(cd api && uv run ffe db import-contacts "/chemin/vers/annuaire.csv" --prod)`.

Raccourci sur le Bureau : dans le Finder, ouvrir `~/FFE/scripts/mac`, clic droit sur `FFE.command` › **Créer un alias**, glisser l'alias sur le Bureau (le renommer « FFE »).

## 3. Tous les jours

Double-clic sur **FFE** (l'alias) : une fenêtre Terminal s'ouvre, FFE démarre, Chrome s'ouvre sur `http://127.0.0.1:8000`.

- **Laisser la fenêtre Terminal ouverte** pendant le travail ; la fermer arrête FFE.
- Au premier lancement, macOS peut demander l'accès au dossier Documents (copie des sauvegardes) : **Autoriser**.
- Sauvegardes : automatiques dans `~/.persist/ffe/backups`, copiées dans `Documents/FFE-sauvegardes` (page Réglages : « Sauvegarder maintenant »).

## 4. Extension Chrome « Envoyer à FFE »

1. Chrome › `chrome://extensions` › activer **Mode développeur** (en haut à droite).
2. **Charger l'extension non empaquetée** › choisir le dossier `~/FFE/extension` (⌘⇧. affiche les dossiers cachés si besoin).
3. Épingler l'extension (icône puzzle › punaise).
4. Ses **Options** : « Adresse de l'API FFE » `http://127.0.0.1:8000`, « Adresse de l'interface FFE » `http://127.0.0.1:8000` (même adresse : pas de serveur de développement sur ce poste).
5. Dans FFE › Réglages › Extension Chrome : **Générer un jeton**, **Copier**, le coller dans les options de l'extension, enregistrer.

## 5. Mettre à jour

À faire **avec Léandre tant que la v1 n'est pas déclarée** : avant la v1, un changement de schéma n'est pas migré automatiquement sur une base existante (ADR-0012). D'abord, FFE fermé, un export lisible :

```bash
cd ~/FFE/api && uv run ffe db export-json ~/Documents/FFE-sauvegardes/avant-maj.json --with-files --prod
cd ~/FFE && git pull && (cd api && uv sync) && (cd web && npm ci && npm run build)
```

Puis relancer FFE. Après la v1, la mise à jour se résume à ces deux lignes : la base se met à niveau seule au démarrage, sauvegarde faite avant.

## 6. En cas de problème

| Symptôme | Cause probable, solution |
|---|---|
| « FFE n'a pas démarré » et « Dossier de données refusé » | Données dans iCloud, Dropbox ou un disque externe : laisser `~/.persist/ffe` (défaut) |
| « FFE tourne déjà (verrou …) » | FFE tourne déjà dans une autre fenêtre Terminal : la fermer, ou utiliser celle-là |
| PDF en erreur (`libpango`, `cannot load library`) | `brew install pango`, puis relancer par l'alias (le lanceur pointe WeasyPrint vers Homebrew) |
| `FFE.command` « ne peut pas être ouvert » | Clic droit › Ouvrir, une fois ; si un zip a été téléchargé plutôt que cloné : `xattr -dr com.apple.quarantine ~/FFE` |
| L'extension dit « Jeton de l'extension absent ou invalide » ou « Failed to fetch » | FFE lancé ? Options sur `http://127.0.0.1:8000` ? Jeton recopié après la dernière régénération ? |

Autres procédures (base abîmée, restauration) : [`RUNBOOK.md`](RUNBOOK.md), avec `--prod` sur chaque commande `ffe db`.
