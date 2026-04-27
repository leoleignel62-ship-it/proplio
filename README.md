# Locavio
Plateforme SaaS de gestion locative pour propriétaires bailleurs.

## Stack technique
- Next.js (App Router) + TypeScript
- Supabase (auth + base de donnees)
- Stripe (paiements)
- Resend (envoi d'emails)

## Installation locale
```bash
git clone <repo-url>
cd gestion-locative
npm install
cp .env.example .env.local
npm run dev
```

## Variables d'environnement
Renseigner les variables requises dans `.env.local` en partant du fichier `.env.example`.

## Deploiement
Le deploiement de production est gere automatiquement par Vercel a chaque push sur `main`.
