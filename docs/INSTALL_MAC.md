# Installer FFE sur un Mac

Notice pas à pas pour installer FFE sur un Mac où rien n'est installé (ni git, ni outils de développement), par quelqu'un qui ne connaît pas macOS. Compter **1 h**, avec une connexion internet et le **mot de passe de session** du Mac (celui qui ouvre la session). Décision et limites : [ADR-0019](decisions/ADR-0019-poste-mac.md).

## 0. Repères macOS

| Besoin | Sur Mac |
|---|---|
| Touche Cmd | `⌘`, à côté de la barre d'espace ; `⌘C` copier, `⌘V` coller |
| Clic droit | clic à deux doigts sur le pavé tactile, ou `Ctrl` + clic |
| Chercher une app | `⌘` + `Espace` (Spotlight), taper le nom, `Entrée` |
| Dossier personnel | `~` dans le Terminal = `/Users/<nom-de-session>` |
| Aller à un dossier dans le Finder | menu **Aller › Aller au dossier…** (`⇧⌘G`), taper par ex. `~/FFE`, `Entrée` |
| Voir les fichiers cachés | `⇧⌘.` dans une fenêtre du Finder ou d'ouverture de fichier |

**Le Terminal** : `⌘ Espace`, taper `Terminal`, `Entrée`. Une fenêtre blanche ou noire s'ouvre avec une invite qui finit par `%`. On y **colle** une commande (`⌘V`) puis on tape `Entrée`, **une commande à la fois**, et on attend le retour de l'invite `%` avant la suivante. Quand le Terminal demande `Password:`, taper le mot de passe de session : **rien ne s'affiche pendant la frappe**, c'est normal, puis `Entrée`.

## 1. Vérifier le Mac (2 min)

Menu ** › À propos de ce Mac** :

- **macOS** : 14 (Sonoma) ou plus récent conseillé (15 Sequoia, 26 Tahoe). Plus ancien : faire d'abord la mise à jour (**Réglages Système › Général › Mise à jour de logiciels**).
- **Puce** : « Apple M1/M2/M3/M4… » (Apple Silicon) ou « Intel ». À noter : l'étape 3 diffère un peu.
- La session doit être **administrateur** (Réglages Système › Utilisateurs et groupes : « Admin » sous le nom). Sinon, faire les étapes 2 et 3 depuis un compte administrateur.

## 2. Outils de ligne de commande Apple (10 à 20 min)

Dans le Terminal :

```bash
xcode-select --install
```

Une fenêtre s'ouvre : **Installer**, puis **Accepter** la licence, attendre « Le logiciel a été installé » (10 à 20 min), **Terminé**. Cela installe notamment `git`. Si le Terminal répond « already installed », passer à la suite.

Vérification : `git --version` affiche `git version 2.…`.

## 3. Homebrew, le gestionnaire de logiciels (5 à 10 min)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

- `Password:` → mot de passe de session (invisible), `Entrée`.
- « Press RETURN/ENTER to continue » → `Entrée`.
- Attendre « Installation successful! ».

**Apple Silicon uniquement** : la fin affiche « ==> Next steps » avec deux ou trois commandes (`echo >> /Users/…/.zprofile`, `echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> …`, `eval …`). Les **sélectionner, copier et coller telles qu'affichées**, une par une. **Intel** : rien à faire.

Puis **fermer le Terminal** (`⌘Q`) et le rouvrir. Vérification : `brew --version` affiche `Homebrew 4.…` (ou plus). Si « command not found » : les « Next steps » n'ont pas été collées.

## 4. Les outils de FFE (5 min)

```bash
brew install uv node@24 pango
brew link --force node@24
```

- `uv` : installe Python 3.14 et les bibliothèques de FFE ; `node@24` : construit l'interface ; `pango` : nécessaire aux PDF.

Vérifications, une par ligne : `uv --version` (`uv 0.…`), `node --version` (`v24.…`), `npm --version` (un numéro).

## 5. Google Chrome (5 min)

Si Chrome n'est pas installé : Safari › `https://www.google.com/chrome/` › **Télécharger Chrome** › ouvrir le fichier `googlechrome.dmg` (dans Téléchargements) › glisser l'icône **Google Chrome** sur le dossier **Applications** › éjecter le disque « Google Chrome » dans la barre latérale du Finder. Ouvrir Chrome une fois (Spotlight : `Chrome`) et accepter « Ouvrir » si macOS le demande.

## 6. Récupérer FFE (5 min)

Dans le Terminal (le dépôt est public, aucun compte GitHub n'est demandé) :

```bash
git clone https://github.com/LDieterlen/ADN-Procurement.git ~/FFE
cd ~/FFE
git switch mac
```

`git switch mac` : tant que la branche `mac` n'est pas fusionnée dans `main` (à retirer ensuite). Résultat : un dossier `FFE` dans le dossier personnel.

## 7. Installer FFE (5 à 10 min)

Toujours dans le Terminal, une ligne à la fois :

```bash
cd ~/FFE/api && uv sync
cd ~/FFE/web && npm ci && npm run build
```

- `uv sync` télécharge Python 3.14 et les bibliothèques : finit sans ligne `error`.
- `npm ci` puis `npm run build` : finit par une ligne `✓ built in …`. Des lignes `npm warn` sont sans gravité.

## 8. Créer la base réelle (1 min)

```bash
mkdir -p ~/Documents/FFE-sauvegardes
cd ~/FFE/api
export FFE_BACKUP_DIR=~/Documents/FFE-sauvegardes
uv run ffe db migrate --prod
uv run ffe db seed --prod
```

La base est créée dans `~/.persist/ffe` (dossier caché, ne pas le déplacer ni le mettre dans iCloud). `seed` pose les 21 types de produit.

**Annuaire de l'agence** (facultatif) : copier le fichier CSV sur le Bureau, puis :

```bash
uv run ffe db import-contacts ~/Desktop/<nom-du-fichier>.csv --prod
```

(taper `uv run ffe db import-contacts ` avec l'espace final, puis **glisser le fichier** depuis le Finder dans la fenêtre du Terminal : son chemin s'écrit tout seul ; ajouter ` --prod`, `Entrée`.)

## 9. Raccourci « FFE » sur le Bureau (2 min)

1. Finder › `⇧⌘G` › taper `~/FFE/scripts/mac` › `Entrée`.
2. Clic droit sur **FFE.command** › **Créer un alias** : un fichier « FFE.command alias » apparaît.
3. Le glisser sur le **Bureau**, le renommer **FFE** (clic sur le nom, `Entrée`, taper, `Entrée`).

## 10. Premier lancement (2 min)

Double-clic sur **FFE** (Bureau) :

- Une fenêtre Terminal s'ouvre, des lignes défilent, puis Chrome s'ouvre sur `http://127.0.0.1:8000` avec FFE.
- « Terminal souhaite accéder aux fichiers de votre dossier Documents » → **Autoriser** (copie des sauvegardes).
- Si macOS refuse d'ouvrir le fichier (« ne peut pas être ouvert ») : **Réglages Système › Confidentialité et sécurité**, tout en bas « FFE.command a été bloqué » › **Ouvrir quand même**, puis relancer.
- **Laisser la fenêtre Terminal ouverte** (on peut la réduire avec le bouton jaune). La fermer arrête FFE.

Vérifier : créer un projet, un article, générer les fiches PDF (si erreur PDF : voir §13).

## 11. Extension Chrome « Envoyer à FFE » (5 min)

1. Dans Chrome, taper `chrome://extensions` dans la barre d'adresse, `Entrée`.
2. En haut à droite, activer **Mode développeur**.
3. **Charger l'extension non empaquetée** › dans la fenêtre, `⇧⌘G` › taper `~/FFE/extension` › `Entrée` › **Sélectionner**.
4. Épingler : icône **puzzle** (à droite de la barre d'adresse) › punaise à côté de « FFE — Envoyer à FFE ».
5. Clic droit sur l'icône de l'extension › **Options** :
   - « Adresse de l'API FFE » : `http://127.0.0.1:8000`
   - « Adresse de l'interface FFE » : `http://127.0.0.1:8000`
6. Dans FFE › **Réglages** › carte « Extension Chrome » › **Générer un jeton** › **Copier**.
7. Retour aux options de l'extension › champ « Jeton » › `⌘V` › **Enregistrer**.

Essai : ouvrir une page produit (n'importe quel site), clic sur l'extension › **Envoyer la fiche** ; dans FFE › un projet › « + Ajouter un article » : la fiche attend dans « Envoyées depuis Chrome ».

## 12. Au quotidien, et mises à jour

- Lancer : double-clic sur **FFE**. Arrêter : fermer sa fenêtre Terminal. Si FFE tourne déjà, le double-clic rouvre simplement Chrome.
- Sauvegardes : automatiques (`~/.persist/ffe/backups`), copiées dans **Documents › FFE-sauvegardes** ; Réglages › « Sauvegarder maintenant ».
- **Mettre à jour : avec Léandre tant que la v1 n'est pas déclarée** (avant la v1, un changement de schéma ne met pas à niveau une base existante, ADR-0012). FFE fermé :

```bash
cd ~/FFE/api && uv run ffe db export-json ~/Documents/FFE-sauvegardes/avant-maj.json --with-files --prod
cd ~/FFE && git pull
cd ~/FFE/api && uv sync
cd ~/FFE/web && npm ci && npm run build
```

Puis relancer par **FFE**. Après la v1, ces lignes suffisent : la base se met à niveau seule au démarrage, sauvegarde faite avant.

## 13. En cas de problème

| Symptôme | Cause probable, solution |
|---|---|
| `command not found: brew` | « Next steps » de Homebrew non collées (§3), ou Terminal non rouvert |
| `command not found: node` | `brew link --force node@24`, puis rouvrir le Terminal |
| « FFE n'a pas démarré » et « Dossier de données refusé » | Données déplacées dans iCloud, Dropbox ou un disque externe : remettre `~/.persist/ffe` |
| « FFE tourne déjà (verrou …) » | Une autre fenêtre Terminal fait tourner FFE : utiliser celle-là, ou la fermer |
| PDF en erreur (`libpango`, `cannot load library`) | `brew install pango`, puis relancer par le raccourci **FFE** (c'est lui qui indique à WeasyPrint où est Pango) |
| Page blanche ou « Not Found » sur `127.0.0.1:8000` | Interface non construite : refaire `cd ~/FFE/web && npm run build` |
| Extension : « Jeton de l'extension absent ou invalide » | Jeton régénéré depuis : le recopier (§11, 6-7) |
| Extension : « Failed to fetch » | FFE non lancé, ou options pas sur `http://127.0.0.1:8000` |

Autres procédures (base abîmée, restauration) : [`RUNBOOK.md`](RUNBOOK.md), avec `--prod` sur chaque commande `ffe db`.
