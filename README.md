# OrangePack ERP

Internal web app for OrangePack staff. The first module issues **quotations (ใบเสนอราคา)** priced from the tiered catalog on [theorangepack.com](https://www.theorangepack.com), tracks their status, and prints them as A4 documents.

- **Quotations** — pick products, size and print method; unit prices fill in from the quantity tier, with below-minimum warnings, manual price overrides, discounts, and VAT (included / added / none). Totals are printed with the Thai amount in words.
- **Status tracking** — draft → sent → accepted / rejected, search, duplicate a quotation.
- **Customers** — saved when a quotation is issued, reusable on the next one.
- **Products & prices** — the full tier price table for all catalog items.

Stack: Next.js 16 (App Router) · Drizzle ORM · Neon Postgres via the Vercel Marketplace · Zod · UI designed with the [Hallmark](https://github.com/nutlope/hallmark) skill.

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
src/app/quotations/   list, new, [id] (document), [id]/edit, server actions
src/app/customers/    customer list
src/app/products/     catalog and tier price tables
src/components/       quotation editor, printable document, menu
src/db/               Drizzle schema and client
src/lib/              pricing tiers, money/VAT math, Thai baht text, dates, company details
scripts/seed.ts       catalog import
tokens.css            design tokens (brand colours, type, spacing)
```

## Before going live

- **No login yet.** Anyone who can reach the URL can create and edit quotations. Add authentication, or at least enable Vercel Deployment Protection, before deploying.
- **Company tax ID** is not published on the website. Set `taxId` in `src/lib/company.ts`; the document shows "รอระบุ" until then.
- **Contact details** in `src/lib/company.ts` are copied from the website; confirm the phone numbers are real.
- **VAT default** for new quotations is "price includes VAT", based on the website's price estimate. Change it in `src/app/quotations/new/page.tsx` if catalog prices exclude VAT.
