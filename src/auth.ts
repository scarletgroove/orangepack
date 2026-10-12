import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as authSchema from "@/db/auth-schema";
import { isAllowedEmail } from "@/lib/allowed-emails";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), { provider: "pg", schema: authSchema }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Only allowlisted staff get an account row; everyone else bounces at sign-in.
        // requireStaff still re-checks on every request, so removing an email revokes access immediately.
        before: async (user) => {
          if (!isAllowedEmail(user.email)) {
            throw new APIError("FORBIDDEN", { message: "email_not_allowed" });
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
