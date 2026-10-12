# OrangePack ERP

Internal web app for OrangePack staff. The first module issues **quotations (ใบเสนอราคา)** priced from the tiered catalog on [theorangepack.com](https://www.theorangepack.com), tracks their status, and prints them as A4 documents.

- **Dashboard (ภาพรวมงาน)** — the home page: jobs that are overdue or due within 7 days, what is still owed on open jobs, accepted quotations waiting to be opened as orders, and quotations still waiting on a customer reply.
- **Quotations** — pick products, size and print method; unit prices fill in from the quantity tier, with below-minimum warnings, manual price overrides, discounts, and VAT 7% added on top (catalog prices exclude VAT) or no VAT. Totals are printed with the Thai amount in words.
- **Status tracking** — draft → sent → accepted / rejected, search, duplicate a quotation.
- **Sales orders (ใบสั่งขาย)** — an accepted quotation opens a production job: รอผลิต → กำลังผลิต → ผลิตเสร็จ → ส่งแล้ว (or ยกเลิก), with a delivery date, deposit percentage and payments received so each order shows what is still owed. Quantities and prices can be corrected only while the order is still รอผลิต.
- **Payments (การชำระเงิน)** — each amount received is its own row: date, method (โอนเงิน / เงินสด / เช็ค / บัตร / อื่น ๆ), reference and note. A deposit and the balance are two dated entries, the order shows ค้างชำระ or ชำระเกิน, and the payments print on the job sheet.
- **Customers** — saved when a quotation is issued, reusable on the next one.
- **Products & prices** — the full tier price table for all catalog items.

Stack: Next.js 16 (App Router) · Drizzle ORM · Neon Postgres and Clerk via the Vercel Marketplace · hosted on Hostinger at https://erp.orangepack.shop · Zod · UI designed with the [Hallmark](https://github.com/nutlope/hallmark) skill.

## Staff access

Staff sign in at `/sign-in` with Clerk (email + password or Google). Only emails listed in the `ALLOWED_EMAILS` environment variable can use the app; anyone else who signs in sees a "no access" page and no data. The check runs on every data read and every server action (`src/lib/auth.ts`), not only in the page redirect.

To add or remove a staff member, edit `ALLOWED_EMAILS` (comma-separated) in hPanel → Websites → erp.orangepack.shop → Environment variables, then Redeploy. New staff then sign up once at https://erp.orangepack.shop/sign-in.

If `ALLOWED_EMAILS` is empty, nobody can get in.

## Databases

| Branch | Endpoint | Used by |
| --- | --- | --- |
| `main` | `ep-silent-pond-b3qphny9` | the deployed app on Hostinger (connection string in hPanel env vars; Vercel still holds a copy) |
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

## Backups and CI

`.github/workflows/ci.yml` runs lint, type-check, `npm test` and the production build on every push and pull request. Pushing to `main` deploys to production on Hostinger, which does not wait for CI — run `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build` locally (or open a PR and wait for green) before pushing.

`.github/workflows/backup.yml` snapshots the production branch daily at 03:00 Bangkok and keeps each snapshot 30 days. This exists because the project's Neon plan caps point-in-time restore at **6 hours** (`history_retention_seconds: 21600`, and the API refuses a higher value), which is not long enough to notice a mistake made yesterday.

It needs a `NEON_API_KEY` secret in GitHub (Settings → Secrets and variables → Actions), created in the Neon console under Account settings → API keys.

Restore a snapshot into a new branch, look at it, and only then decide what to copy back:

```bash
npx neon@latest snapshots list --project-id small-voice-34844459
npx neon@latest snapshots restore <snapshot-id> --project-id small-voice-34844459
```

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

Money received lives in `sales_order_payments`, the record of what actually arrived. `sales_orders.paid_satang` is only a cached sum of it, refreshed in the same write whenever a payment is added or removed, so lists and the dashboard need no join. Cutting an order below what has been paid never rewrites a payment: the order reports ชำระเกิน instead, a refund to settle outside the app.

One sales order per quotation, enforced by a unique index. The order snapshots the customer and the lines, so later catalog or customer edits never change an order that has been agreed. Cancelled orders can be reopened or deleted; deleting one frees its quotation to be converted again.

## Project layout

```
src/app/(app)/quotations/   list, new, [id] (document), [id]/edit, server actions
src/app/(app)/page.tsx       dashboard of due and overdue jobs
src/app/(app)/orders/        sales order list, [id] (document + production/payment forms), server actions
src/app/(app)/customers/    customer list
src/app/(app)/products/     catalog and tier price tables
src/app/sign-in/            Clerk sign-in page
src/app/no-access/          shown to signed-in users who are not on the allowlist
src/proxy.ts                redirects signed-out visitors to /sign-in
src/components/             quotation editor, printable document, menu
src/db/                     Drizzle schema and client
src/lib/                    staff access check, pricing tiers, money/VAT math, Thai baht text, dates, order and payment input rules, job urgency
drizzle/                    SQL migrations, applied with npm run db:migrate
scripts/seed.ts       catalog import
tokens.css            design tokens (brand colours, type, spacing)
```

## Production on Hostinger (`erp.orangepack.shop`)

Production runs on Hostinger Cloud hosting at `erp.orangepack.shop`, with a Clerk production instance on that subdomain. `orangepack.shop` itself is left free. Nothing in the code is Vercel-specific; the app runs with `npm run build` and `npm start` on Node 20.9 or newer (use 22).

`orangepack.shop` uses Hostinger's nameservers (`cosmos.dns-parking.com`, `nova.dns-parking.com`), so every DNS record is added in hPanel → Domains → orangepack.shop → DNS / Nameservers → DNS records. hPanel appends `.orangepack.shop` to the Name field, so enter only the part before it.

**1. The Clerk app is managed by Vercel.** Clerk (`orangepack-erp-auth`, app `app_3JPtMZNck3qt9hHKNn2DudM8xku`) and Neon were both installed through the Vercel Marketplace on the team `scarletgrooves-projects`, and Vercel bills and owns them. Open Clerk from Vercel → Integrations → Clerk → Open in Clerk. Keep both integrations installed after the move — removing one would likely delete the Clerk app or the database with it.

**2. Set the Clerk production domain — in Vercel, not Clerk.** Vercel created the production instance with a placeholder domain (`firm.yeti-249.lcl.dev`, whose publishable key decodes to `.clerk.accounts.dev`). Because the integration owns the domain, Clerk's Danger zone has no Change domain option and the Backend API `change_domain` call returns 403 `domain_managed_by_integration`. Change it in Vercel → Integrations → Clerk → `orangepack-erp-auth` → Update Configuration → **Production domain** = `erp.orangepack.shop`. Clerk then serves its Frontend API at `clerk.erp.orangepack.shop` and the Account Portal at `accounts.erp.orangepack.shop`, and issues a new publishable key (`pk_live_Y2xlcmsuZXJwLm9yYW5nZXBhY2suc2hvcCQ`, i.e. base64 of `clerk.erp.orangepack.shop$`). The secret key does not change.

**3. Add Clerk's DNS records**, all type CNAME. These are the instance's actual targets (from Clerk's Backend API `GET /v1/domains`); if the domain is ever changed again, re-read them from Clerk's Domains page.

**They belong in the `erp.orangepack.shop` zone, not the `orangepack.shop` zone.** Attaching the subdomain to the Hostinger website (step 5) makes hPanel create a separate DNS zone for `erp.orangepack.shop`, delegated with its own NS records. From then on every `*.erp.orangepack.shop` lookup is answered by that zone, and records named `clerk.erp` etc. in the `orangepack.shop` zone are silently ignored — Clerk's script stops loading and the sign-in box renders blank. In the `erp.orangepack.shop` zone, hPanel appends `.erp.orangepack.shop`, so the names are short:

| Name (in the `erp.orangepack.shop` zone) | Full host | Target |
| --- | --- | --- |
| `clerk` | clerk.erp.orangepack.shop | `frontend-api.clerk.services` |
| `accounts` | accounts.erp.orangepack.shop | `accounts.clerk.services` |
| `clkmail` | clkmail.erp.orangepack.shop | `mail.d0ntb1c2t3p6.clerk.services` |
| `clk._domainkey` | clk._domainkey.erp.orangepack.shop | `dkim1.d0ntb1c2t3p6.clerk.services` |
| `clk2._domainkey` | clk2._domainkey.erp.orangepack.shop | `dkim2.d0ntb1c2t3p6.clerk.services` |

The old `clerk.erp`-style copies are still in the `orangepack.shop` zone; they are unused but harmless, and would take over again if the `erp` zone were ever removed. Check against a public resolver, not your own machine (which may hold a cached answer for hours): `dig +short clerk.erp.orangepack.shop @8.8.8.8` should end in Cloudflare IPs, and `dig +short erp.orangepack.shop NS @8.8.8.8` shows whether the separate zone exists.

Then Verify in Clerk, and Deploy certificates once every record is green. `https://clerk.erp.orangepack.shop/v1/environment` should then answer with `instance_environment_type: production`; `accounts.erp.orangepack.shop` sits behind a Cloudflare bot check, so scripted requests get a 403 "Just a moment..." page while browsers load it normally.

**4. Google sign-in.** Development uses Clerk's shared Google credentials; production needs your own. In Clerk → Production → Configure → SSO connections → Google, turn on custom credentials and copy its redirect URI. In Google Cloud Console → APIs & Services → Credentials, create an OAuth client (Web application) with:

- Authorized JavaScript origin: `https://erp.orangepack.shop`
- Authorized redirect URI: the one Clerk shows (expected `https://clerk.erp.orangepack.shop/v1/oauth_callback`)

Paste the client ID and secret into Clerk, and publish the consent screen (while it is in Testing, only listed test users can sign in).

**5. Create the Hostinger Node.js app** on the domain `erp.orangepack.shop` (hPanel creates the subdomain's DNS zone and address records itself; if the app lands on `orangepack.shop` instead, move it with the website's Manage domain), from the GitHub repo with build command `npm run build` and start command `npm start`. (`npm run build` uses webpack — `next build --webpack` — because Turbopack, Next 16's default bundler, crashes on Hostinger: its sandbox kills the PostCSS worker process Turbopack spawns for `globals.css`. Webpack runs PostCSS in-process.) Turn on SSL for the subdomain and GitHub auto-deploy. Set these environment variables, then rebuild — `NEXT_PUBLIC_*` values are baked in at build time, so changing one needs a rebuild:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` from Clerk Production → API keys |
| `CLERK_SECRET_KEY` | `sk_live_…` from the same page |
| `DATABASE_URL` | the Neon `main` branch connection string |
| `ALLOWED_EMAILS` | comma-separated staff emails |

Live keys only work on `erp.orangepack.shop`; `.env.local` keeps the development keys. On Hostinger, changing `ALLOWED_EMAILS` is done in the app's environment settings followed by a redeploy, in place of the `vercel env` commands above.

**6. Switch over.** Staff accounts in the Clerk development instance do not carry over: each person signs up once at `https://erp.orangepack.shop/sign-in` with the same email. Check in a private window that a listed email reaches the quotations page with no "Development mode" badge and an unlisted email lands on the no-access page. Then turn off Vercel so only one copy of the app writes to the database. This is done: the Vercel project `orangepack-erp` has its GitHub repo disconnected (no more deployments) and is paused (`*.vercel.app` returns 503). The project stays because it holds the Clerk and Neon integrations — do not delete it or uninstall them. To bring it back: Settings → Git → connect `scarletgroove/orangepack`, and resume the project.

## Before going live

- **Company details** — the business is not registered yet, so quotations show only the OrangePack logo (no address, contact details or tax ID) and are meant as preliminary quotes. After registering, add the legal name, address and tax ID back to the header in `src/components/quotation-document.tsx`.