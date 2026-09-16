import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Optimistic sign-in redirect only; the email allowlist is enforced in src/lib/auth.ts next to the data.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) await auth.protect();
  },
  { signInUrl: "/sign-in" },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
