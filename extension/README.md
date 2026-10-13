# Extension Chrome « Envoyer à FFE » (étape F6, ADR-0017)

Un bouton dans Chrome qui envoie la fiche produit affichée à l'outil FFE local. Utile sur les sites qui refusent « Coller une adresse » (protection Cloudflare, connexion requise) : la page est lue **dans le navigateur**, qui a déjà passé ces contrôles. La fiche atterrit dans « Nouvel article » (carte « Envoyées depuis Chrome »), où l'on choisit le projet, le type et la localisation avant de créer l'article.

Aucun outil de construction : trois fichiers HTML/JS chargés tels quels (Manifest V3).

## Installation (une fois)

1. Dans FFE : **Réglages → Extension Chrome → Générer un jeton**, copier le jeton.
2. Dans Chrome : `chrome://extensions`, activer **Mode développeur**, **Charger l'extension non empaquetée**, choisir ce dossier `extension/` (le dépôt est visible depuis Windows).
3. Cliquer l'icône de l'extension → **Options** : vérifier l'adresse de l'API (`http://localhost:8000`, port transféré par VS Code quand l'API tourne) et coller le jeton. Enregistrer.
4. Épingler l'icône dans la barre de Chrome.

## Usage

Sur une page produit : icône → **Envoyer la fiche**. L'extension lit la page telle qu'affichée, l'API en extrait nom, marque, référence, prix, description et photo (JSON-LD, OpenGraph, titre) ; si le serveur ne peut pas télécharger la photo, l'extension l'envoie elle-même. Puis dans FFE, projet → « + Ajouter un article » → carte « Envoyées depuis Chrome » → **Utiliser**.

## Ce que l'extension ne fait pas

Pas de parcours de site, pas de capture en masse, pas de contournement : une page, à la demande, celle que l'utilisateur regarde. Elle ne parle qu'à l'API locale (jeton `X-FFE-Token`) ; `host_permissions` couvre tous les sites parce que l'adresse des images n'est pas connue d'avance.

## Vérifier

`./check.sh` couvre l'API (`test_api_capture.py`, boîte de réception et jeton) et l'interface (`ItemNewPage.test.tsx`, `SettingsPage.test.tsx`). L'extension elle-même se vérifie à la main : envoyer une page La Redoute, voir la carte apparaître sur « Nouvel article ».
