# OrangePack ERP

Internal web app for OrangePack staff. The first module issues **quotations (ใบเสนอราคา)** priced from the tiered catalog on [theorangepack.com](https://www.theorangepack.com), tracks their status, and prints them as A4 documents.

- **Quotations** — pick products, size and print method; unit prices fill in from the quantity tier, with below-minimum warnings, manual price overrides, discounts, and VAT 7% added on top (catalog prices exclude VAT) or no VAT. Totals are printed with the Thai amount in words.
- **Status tracking** — draft → sent → accepted / rejected, search, duplicate a quotation.
- **Customers** — saved when a quotation is issued, reusable on the next one.
- **Products & prices** — the full tier price table for all catalog items.

Stack: Next.js 16 (App Router) · Drizzle ORM · Neon Postgres and Clerk via the Vercel Marketplace · Zod · UI designed with the [Hallmark](https://github.com/nutlope/hallmark) skill.

## Staff access

Staff sign in at `/sign-in` with Clerk (email + password or Google). Only emails listed in the `ALLOWED_EMAILS` environment variable can use the app; anyone else who signs in sees a "no access" page and no data. The check runs on every data read and every server action (`src/lib/auth.ts`), not only in the page redirect.

To add or remove a staff member, replace the list (comma-separated) and redeploy:

```bash
npx vercel env rm ALLOWED_EMAILS production --yes
printf 'owner@example.com,staff@example.com' | npx vercel env add ALLOWED_EMAILS production
npx vercel deploy --prod
```

If `ALLOWED_EMAILS` is empty, nobody can get in.

## Prerequisites

- Node.js 20.9 or newer
- Access to the Vercel team `scarletgrooves-projects` (project `orangepack-erp`), which holds the database credentials

## Setup

```bash
git clone https://github.com/scarletgroove/orangepack.git
cd orangepack
npm install

# Log in and link this folder to the existing Vercel project
npx vercel login
npx vercel link --yes --project orangepack-erp

# Download the database credentials into .env.local (git-ignored)
npx vercel env pull .env.local --yes

# Create the tables and load the product catalog
npm run db:push
npm run db:seed

npm run dev
```

Open http://localhost:3000.

### Using a new database instead

To start with an empty database of your own, link to your own Vercel project and add Neon before pulling env vars:

```bash
npx vercel link --yes
npx vercel integration add neon --metadata region=sin1
npx vercel env pull .env.local --yes
npm run db:push
npm run db:seed
```

The first `integration add` asks you to accept Neon's terms in the browser; run the command again afterwards.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply `src/db/schema.ts` to the database |
| `npm run db:seed` | Load `data/theorangepack-catalog.json` into products, variants and price tiers. Safe to re-run: it updates existing rows instead of duplicating them |

## Updating catalog prices

Prices come from the website's `assets/catalog.js`. To refresh them:

```bash
curl -sL https://www.theorangepack.com/assets/catalog.js -o /tmp/catalog.js
node -e 'global.window={};require("/tmp/catalog.js");require("fs").writeFileSync("data/theorangepack-catalog.json",JSON.stringify({order:window.OP_CATALOG_ORDER,catalog:window.OP_CATALOG},null,1))'
npm run db:seed
```

Product photos live in `public/products/` under the same file names as the website. Add a photo there when a new product appears.

Issued quotations keep their own copy of product names and prices, so re-seeding never changes existing documents.

## Project layout

```
src/app/(app)/quotations/   list, new, [id] (document), [id]/edit, server actions
src/app/(app)/customers/    customer list
src/app/(app)/products/     catalog and tier price tables
src/app/sign-in/            Clerk sign-in page
src/app/no-access/          shown to signed-in users who are not on the allowlist
src/proxy.ts                redirects signed-out visitors to /sign-in
src/components/             quotation editor, printable document, menu
src/db/                     Drizzle schema and client
src/lib/                    staff access check, pricing tiers, money/VAT math, Thai baht text, dates
scripts/seed.ts       catalog import
tokens.css            design tokens (brand colours, type, spacing)
```

## Before going live

- **Clerk development instance.** The app currently uses Clerk development keys, which show a "Development mode" badge and have a user cap. Moving to a Clerk production instance requires a custom domain.
- **Company details** — the business is not registered yet, so quotations show only the OrangePack logo (no address, contact details or tax ID) and are meant as preliminary quotes. After registering, add the legal name, address and tax ID back to the header in `src/components/quotation-document.tsx`.