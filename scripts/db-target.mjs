// Prints which database the next command will touch. Wired into db:migrate and db:seed because
// .env.local can point at either the dev branch or production — `vercel env pull` silently repoints it.
import { readFileSync } from "node:fs";

const line = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .split("\n")
  .find((l) => l.startsWith("DATABASE_URL="));

if (!line) {
  console.error("No DATABASE_URL in .env.local — run `npx vercel env pull .env.local --yes` first.");
  process.exit(1);
}

const host = new URL(line.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "")).hostname;
const endpoint = host.split(".")[0].replace(/-pooler$/, "");
console.log(`→ database: ${endpoint}  (${host})`);
