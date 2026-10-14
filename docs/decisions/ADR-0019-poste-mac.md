# ADR-0019 — Faire tourner FFE sur un Mac, sans paquet
Date : 2026-10-14
Statut : acceptée
## Contexte
L'outil doit tourner sur le Mac d'une utilisatrice non développeuse, installé avec elle (pas de `.app`, pas de signature Apple). Le cycle de démarrage exige un dossier de données sur `ext4` et le vérifie dans `/proc/mounts` (ARCHITECTURE §5) : absent sur macOS, dont les disques sont en APFS. Le risque visé reste vrai partout : un dossier réseau ou synchronisé perd le WAL et les verrous.
## Décision
- `db/fs_check.ensure_safe_data_dir` remplace `ensure_ext4`. Linux : inchangé (`ext4` exigé via `/proc/mounts`). macOS (`sys.platform == "darwin"`) : le dossier résolu doit être sous le dossier personnel et hors des dossiers synchronisés (`~/Library/Mobile Documents` = iCloud Drive, `~/Library/CloudStorage` = Dropbox, OneDrive, Google Drive) et hors `/Volumes` (disques externes et réseau). Autre système : refus.
- Données au même endroit que sous Linux : `~/.persist/ffe` (`--prod`). Copie des sauvegardes : `FFE_BACKUP_DIR=~/Documents/FFE-sauvegardes`, posé par le lanceur (une copie terminée peut être synchronisée).
- Lanceur `scripts/mac/FFE.command` (double-clic) : `ffe serve --prod`, attente de `/api/v1/health`, ouverture de Chrome sur `http://127.0.0.1:8000` ; `DYLD_FALLBACK_LIBRARY_PATH` vers les bibliothèques Homebrew pour WeasyPrint.
- Installation pas à pas : `docs/INSTALL_MAC.md` (Homebrew : `uv`, `node@24`, `pango` ; clone, `uv sync`, `npm ci && npm run build`, `migrate --prod`, `seed --prod`). Extension chargée non empaquetée, options sur `http://127.0.0.1:8000` pour l'API et l'interface.
## Alternatives écartées
- `.app` signée et notarisée (PyInstaller) : coût Apple et Pango à embarquer ; reportée tant qu'une personne installe avec l'utilisatrice.
- Supprimer le contrôle sur macOS : perd la protection contre iCloud et les disques réseau.
- Lire le type de système de fichiers (`statfs`) : pas d'API stdlib, `ctypes` fragile pour un gain faible.
## Conséquences
`startup.py` appelle `ensure_safe_data_dir` ; tests de la règle macOS par chemins (sans Mac) ; essai réel à faire sur le Mac. Avant la v1, un changement de schéma régénère `0001_initial.py` : une base réelle existante ne se met pas à niveau, d'où l'export JSON avant chaque mise à jour tant que la v1 n'est pas déclarée.
## Repli
Revenir à `ensure_ext4` (un appel) ; le lanceur et la notice sont indépendants du code.
