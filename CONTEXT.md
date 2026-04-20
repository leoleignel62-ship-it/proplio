# CONTEXT.md — Plateforme de Gestion Locative

## Description du projet
Application SaaS permettant aux propriétaires immobiliers de gérer toutes leurs démarches administratives locatives : quittances de loyer, baux de location, et états des lieux.

## Stack technique
- Frontend : Next.js 16 + TypeScript + Tailwind CSS
- Base de données : Supabase (PostgreSQL)
- Authentification : Supabase Auth
- Génération PDF : pdf-lib
- Envoi d'emails : Resend
- Stockage photos : Supabase Storage
- Déploiement : Vercel

## Utilisateur cible
Propriétaire bailleur français, seul utilisateur de la plateforme, pouvant gérer un ou plusieurs logements avec un ou plusieurs locataires.

## Modules principaux

### 1. MODULE QUITTANCES
- Création de profils locataires (nom, prénom, email, téléphone)
- Création de fiches logements (adresse, type, surface, loyer, charges)
- Saisie des informations du propriétaire (nom, adresse, email)
- Assemblage quittance : lier un locataire + un logement + une période
- Gestion colocation : plusieurs locataires pour un même logement
- Génération PDF automatique de la quittance
- Envoi par email en 1 clic
- Statut visuel : quittance envoyée / non envoyée par mois

### 2. MODULE BAUX
- Formulaire complet conforme loi Alur (France)
- Informations légales obligatoires :
  - Identité bailleur et locataire(s)
  - Description précise du logement
  - Surface habitable (loi Carrez si applicable)
  - Montant loyer + charges + modalités de révision (IRL)
  - Dépôt de garantie
  - Date de prise d'effet et durée du bail
  - Diagnostics techniques (DPE, amiante, plomb, etc.)
  - Équipements et annexes inclus
- Inventaire du logement : description écrite ou photos
- Génération PDF du bail complet
- Lien avec profils locataires et fiches logements existants

### 3. MODULE ÉTATS DES LIEUX
- État des lieux d'entrée et de sortie
- Pièce par pièce avec description de l'état
- Upload de photos par pièce
- Comparaison entrée / sortie
- Génération PDF avec photos intégrées
- Lien avec bail et locataire concernés

## Règles de développement
- Tout le code est en français côté interface utilisateur
- Conformité avec la législation française (loi Alur, loi du 6 juillet 1989)
- Interface simple, rapide, efficace — le propriétaire doit pouvoir envoyer une quittance en moins de 30 secondes
- Design sobre et professionnel
- Mobile responsive