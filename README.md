# Garage des Annonces — version web (Next.js)

Front-end seul pour l'instant (comme convenu) : même expérience que l'app
mobile — on dépose un fichier .xlsx, les annonces s'affichent avec leurs
vraies photos et un lien cliquable vers l'annonce d'origine. Les 3 lots
déjà préparés (Mercedes, Audi, Audi fiables — 45 annonces avec photos)
sont inclus directement dans le code, donc rien à re-télécharger.

Une fois en ligne sur Vercel, le site sera accessible depuis n'importe quel
appareil (PC éteint ou pas). Supabase (base de données) sera ajouté dans un
second temps pour que les annonces importées soient sauvegardées côté
serveur plutôt que juste dans le navigateur.

## Étape 1 — Créer le projet

Dans un terminal normal Windows (PowerShell), PAS dans l'environnement
Claude :

```powershell
cd C:\Users\reda\Desktop\React\cars
npx create-next-app@latest .
```

Répondez :
- TypeScript → **Yes**
- ESLint → Yes (peu importe)
- Tailwind CSS → **No** (le style est déjà écrit en CSS classique)
- `src/` directory → **Yes**
- App Router → **Yes**
- Import alias → peu importe (le code n'en dépend pas)

Puis :

```powershell
npm install xlsx
```

Dites-le-moi une fois fait — j'ajouterai directement dans le dossier :

- `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` — l'écran
  principal
- `src/components/CarCard.tsx`, `src/components/StatStrip.tsx`
- `src/lib/parseWorkbook.ts`, `src/lib/pickAndParse.ts`, `src/lib/favorites.ts`
- `src/data/samples.ts`, `src/data/manifest.ts` — les 45 annonces
  d'exemple avec leurs vraies photos déjà intégrées

## Étape 2 — Tester en local

```powershell
npm run dev
```

Ouvrez `http://localhost:3000`.

## Étape 3 — Mettre en ligne gratuitement sur Vercel

1. Poussez le dossier sur un repo GitHub.
2. Sur [vercel.com](https://vercel.com), "New Project" → importez ce repo
   → Deploy (aucune configuration nécessaire, Next.js est détecté
   automatiquement).
3. Vous obtenez une URL du type `garage-des-annonces.vercel.app`,
   accessible depuis votre iPhone sans que le PC soit allumé.

## Étape 4 — Brancher Supabase (stockage des annonces)

Les annonces sont maintenant lues et écrites depuis une vraie base de
données (Supabase = Postgres hébergé, gratuit à ce niveau d'usage) au lieu
d'être codées en dur. Les favoris restent sur l'appareil (localStorage) —
seules les annonces elles-mêmes sont partagées entre appareils.

1. Créez un compte/projet gratuit sur [supabase.com](https://supabase.com).
2. Dans votre projet → **SQL Editor** → New query → collez le contenu de
   `supabase/schema.sql` (déjà dans le dossier) → Run. Ça crée la table
   `cars` avec la sécurité (RLS) qui autorise la lecture publique mais pas
   l'écriture directe depuis le navigateur.
3. Dans **Settings → API**, récupérez 3 valeurs : `Project URL`, la clé
   `anon` `public`, et la clé `service_role` (secrète, ne jamais la mettre
   dans le code ni la partager).
4. Dupliquez `.env.local.example` en `.env.local` et collez ces 3 valeurs.
5. Installez les dépendances :
   ```powershell
   npm install @supabase/supabase-js
   npm install -D dotenv tsx
   ```
6. Migrez les 45 annonces d'exemple (une fois) :
   ```powershell
   npx tsx scripts/seed.ts
   ```
7. `npm run dev` → les annonces viennent maintenant de la base. Le bouton
   "Importer un fichier .xlsx" envoie le fichier à `/api/import`, qui
   l'ajoute dans la base sous l'onglet "Importées" (visible depuis
   n'importe quel appareil après rechargement, pas seulement celui qui a
   fait l'import).

**Limite connue à savoir** : `/api/import` n'a pas encore de mot de passe —
n'importe qui connaissant l'adresse du site pourrait y envoyer un fichier.
Pas un risque grave pour un usage personnel avec une URL non partagée,
mais dites-le-moi si vous voulez que j'ajoute une protection simple avant
de partager le lien plus largement.

## Étape 5 — Mettre à jour Vercel avec les variables d'environnement

En plus des étapes de l'Étape 3, ajoutez les 3 variables de `.env.local`
dans Vercel : Project → Settings → Environment Variables → collez
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et
`SUPABASE_SERVICE_ROLE_KEY` → redeploy.
