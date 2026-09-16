import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";

// Access is invite-by-email: ALLOWED_EMAILS is a comma/space-separated list set in Vercel env vars.
// Unset means nobody is allowed — fail closed.
function allowedEmails() {
  return new Set(
    (process.env.ALLOWED_EMAILS ?? "")
      .split(/[\s,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export type StaffStatus =
  | { signedIn: false }
  | { signedIn: true; allowed: boolean; email: string | null; name: string | null };

export const getStaffStatus = cache(async (): Promise<StaffStatus> => {
  const { userId } = await auth();
  if (!userId) return { signedIn: false };

  const user = await currentUser();
  const verified = (user?.emailAddresses ?? [])
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());
  const allowed = allowedEmails();
  const match = verified.find((e) => allowed.has(e));

  return {
    signedIn: true,
    allowed: Boolean(match),
    email: match ?? verified[0] ?? null,
    name: user?.fullName ?? null,
  };
});

/** Call before every data read or mutation. Redirects instead of returning when access is denied. */
export const requireStaff = cache(async () => {
  const status = await getStaffStatus();
  if (!status.signedIn) redirect("/sign-in");
  if (!status.allowed) redirect("/no-access");
  return status;
});
