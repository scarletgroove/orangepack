# OrangePack ERP

Internal web app for OrangePack staff. The first module issues **quotations (ใบเสนอราคา)** priced from the tiered catalog on [theorangepack.com](https://www.theorangepack.com), tracks their status, and prints them as A4 documents.

- **Quotations** — pick products, size and print method; unit prices fill in from the quantity tier, with below-minimum warnings, manual price overrides, discounts, and VAT 7% added on top (catalog prices exclude VAT) or no VAT. Totals are printed with the Thai amount in words.
- **Status tracking** — draft → sent → accepted / rejected, search, duplicate a quotation.
- **Sales orders (ใบสั่งขาย)** — an accepted quotation opens a production job: รอผลิต → กำลังผลิต → ผลิตเสร็จ → ส่งแล้ว (or ยกเลิก), with a delivery date, deposit percentage and payments received so each order shows what is still owed. Quantities and prices can be corrected only while the order is still รอผลิต.
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

## Databases

| Branch | Endpoint | Used by |
| --- | --- | --- |
| `main` | `ep-silent-pond-b3qphny9` | the deployed app (env vars live in Vercel) |
| `dev` | `ep-withered-breeze-b3biyago` | local development (`.env.local`) |

Both are branches of the Neon project `orangepack-erp-db` (`small-voice-34844459`) in the Vercel-owned org `org-jolly-queen-65685148`. `dev` is a copy-on-write clone of `main`: it starts with production's schema and data, and writes to it never reach production.

**`npx vercel env pull` overwrites `.env.local` with the production connection string.** After running it, point local development back at the dev branch:

```bash
npx neon@latest connection-string dev --project-id small-voice-34844459 --pooled
# put that value in DATABASE_URL in .env.local (and the unpooled one in DATABASE_URL_UNPOOLED)
```

`npm run db:migrate` and `npm run db:seed` print the endpoint they are about to touch, so check that line before answering for a migration. `npm run db:target` prints it on its own.

To refresh dev with current production data, delete the branch and make it again:

```bash
npx neon@latest branches delete dev --project-id small-voice-34844459
npx neon@latest branches create --project-id small-voice-34844459 --name dev --parent main
```

Neon commands need a signed-in CLI (`npx neon@latest auth`, once per machine).

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

# Download the credentials into .env.local (git-ignored), then repoint the
# database at the dev branch — see "Databases" above
npx vercel env pull .env.local --yes

# Create the tables and load the product catalog
npm run db:migrate
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
npm run db:migrate
npm run db:seed
```

The first `integration add` asks you to accept Neon's terms in the browser; run the command again afterwards.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for the money, pricing and date rules (`src/lib/*.test.ts`) |
| `npm run db:generate` | Write a new SQL migration in `drizzle/` from changes to `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations in `drizzle/` to the database in `.env.local` |
| `npm run db:seed` | Load `data/theorangepack-catalog.json` into products, variants and price tiers. Safe to re-run: it updates existing rows instead of duplicating them |

## Tests

```bash
npm test
```

Node's built-in test runner, run through `tsx`, over `src/lib/*.test.ts` — no test framework to install. The tests cover the rules that decide what a customer is charged: VAT added on top, discounts applied before VAT, tier prices and below-minimum quantities, Thai amount-in-words, and the sales order money (deposit as a share of the total, the balance owing, and repeated edits to a quantity always landing on the same figures). They are pure functions with no database or network, so they run in under a second.

Add a case whenever you change pricing, VAT, deposits or date handling.

## Changing the database schema

The database is changed only through migration files in `drizzle/`, which are committed with the code. Don't use `drizzle-kit push`: it changes the database without leaving a record.

1. Edit `src/db/schema.ts`.
2. `npm run db:generate -- --name short_description` and read the generated SQL in `drizzle/`.
3. `npm run db:migrate` to apply it. The local `.env.local` points at the same database the live app uses, so this changes production.
4. Commit the schema change and the migration together, then deploy.

Run the migration **before** deploying code that reads new columns. Prefer changes that old code tolerates (new nullable columns, new tables); for renames or drops, ship in two steps.

`drizzle/0000_baseline.sql` is the schema as it existed when migrations were introduced. The existing database already has it marked as applied; a fresh database runs it like any other migration.

## Updating catalog prices

Prices come from the website's `assets/catalog.js`. To refresh them:

```bash
curl -sL https://www.theorangepack.com/assets/catalog.js -o /tmp/catalog.js
node -e 'global.window={};require("/tmp/catalog.js");require("fs").writeFileSync("data/theorangepack-catalog.json",JSON.stringify({order:window.OP_CATALOG_ORDER,catalog:window.OP_CATALOG},null,1))'
npm run db:seed
```

Product photos live in `public/products/` under the same file names as the website. Add a photo there when a new product appears.

Issued quotations keep their own copy of product names and prices, so re-seeding never changes existing documents.

## How the modules connect

```
quotation (accepted) ──► sales order ──► production status ──► delivered
```

One sales order per quotation, enforced by a unique index. The order snapshots the customer and the lines, so later catalog or customer edits never change an order that has been agreed. Cancelled orders can be reopened or deleted; deleting one frees its quotation to be converted again.

## Project layout

```
src/app/(app)/quotations/   list, new, [id] (document), [id]/edit, server actions
src/app/(app)/orders/        sales order list, [id] (document + production/payment forms), server actions
src/app/(app)/customers/    customer list
src/app/(app)/products/     catalog and tier price tables
src/app/sign-in/            Clerk sign-in page
src/app/no-access/          shown to signed-in users who are not on the allowlist
src/proxy.ts                redirects signed-out visitors to /sign-in
src/components/             quotation editor, printable document, menu
src/db/                     Drizzle schema and client
src/lib/                    staff access check, pricing tiers, money/VAT math, Thai baht text, dates, order input rules
drizzle/                    SQL migrations, applied with npm run db:migrate
scripts/seed.ts       catalog import
tokens.css            design tokens (brand colours, type, spacing)
```

## Before going live

- **Clerk development instance.** The app currently uses Clerk development keys, which show a "Development mode" badge and have a user cap. Moving to a Clerk production instance requires a custom domain.
- **Company details** — the business is not registered yet, so quotations show only the OrangePack logo (no address, contact details or tax ID) and are meant as preliminary quotes. After registering, add the legal name, address and tax ID back to the header in `src/components/quotation-document.tsx`.