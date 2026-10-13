# ADR-0014 — « Coller une adresse » : lecture générique d'une page produit, côté serveur, à la demande
Date : 2026-10-12
Statut : acceptée (demande de l'utilisateur du 2026-10-12 ; défauts appliqués en mode enchaîné)

## Contexte
Les fabricants n'offrent pas d'API de catalogue, mais la plupart des pages produit portent des données structurées pour les moteurs de recherche (`schema.org/Product` en JSON-LD, balises OpenGraph). Vérifié le 2026-10-12 sur tikamoon.com depuis le conteneur : nom, marque, référence, photo, prix et description lisibles ; le réseau sortant fonctionne. L'utilisateur veut pré-remplir les champs de base d'un article ou d'un produit, sans règle propre à un site.

## Décision
- **Serveur seulement** : `GET /captures/preview?url=` lit la page une fois (`urllib`, `User-Agent` explicite, 10 s, 3 Mo, `http`/`https` seulement) et renvoie `{name, brand, reference, imageUrl, priceCents, currency, description, source}` ; `POST /captures/image {url}` télécharge l'image, la reconnaît par ses octets (JPEG, PNG, WebP) et la conserve comme un envoi (`file`, `source_url` renseigné). Le front n'appelle jamais l'extérieur ; l'image s'affiche depuis `/files/{id}/content`.
- **Extraction générique** (`captures/extract.py`, stdlib) : JSON-LD `Product` d'abord (`name`, `brand`, `sku` ou `mpn`, `image`, `offers.price`/`priceCurrency`, `description`), OpenGraph et `product:*` pour les trous, titre de la page en dernier recours. Aucune règle par site : dimensions, finitions et type restent à saisir.
- **Prix tel qu'affiché** : souvent public et TTC ; copié dans « Prix unitaire HT » avec un avertissement, à corriger par l'utilisateur. Le type de produit n'est pas déduit.
- **Rien n'est enregistré sans validation** : la prévisualisation n'écrit rien ; l'image n'est téléchargée que sur « Utiliser » ; la marque ne crée **jamais** de fournisseur (depuis le 2026-10-13 ; avant : création automatique) : les fournisseurs existants dont le nom lui ressemble sont proposés, un seul est présélectionné, sinon le choix reste à l'utilisateur.
- **Où** : page « Nouvel article » et fiche produit (création), même composant `UrlCaptureBox` ; la photo est jointe à l'article ou au produit créé.
- La `Deps` porte `fetch_url` : seul accès réseau sortant de l'application, remplacé par un faux dans les tests.

## Alternatives écartées
- Scraping par site ou capture en masse : interdit par le cadrage (plan du 2026-10-09).
- Lecture côté navigateur : CORS et règle « le front n'appelle jamais un service externe ».
- Dépendance HTML (BeautifulSoup) : le besoin tient en expressions régulières sur trois sources.

## Conséquences
Nouveau module `captures/`, service `capture.py`, route `/captures`, `Deps.fetch_url` ; tests avec faux fetcher ; `API.md`, `ARCHITECTURE` §2 et §10, ROADMAP F5 cochée. Sites rendus en JavaScript ou bloquant les lectures : seul le titre, parfois rien.

## Repli
Désactiver la route ; les données déjà copiées restent sur les articles.
