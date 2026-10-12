import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/allowed-emails";

export type StaffStatus =
  | { signedIn: false }
  | { signedIn: true; allowed: boolean; email: string | null; name: string | null };

export const getStaffStatus = cache(async (): Promise<StaffStatus> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { signedIn: false };

  const { user } = session;
  const email = user.emailVerified ? user.email.toLowerCase() : null;

  return {
    signedIn: true,
    allowed: isAllowedEmail(email),
    email: email ?? user.email,
    name: user.name || null,
  };
});

/** Call before every data read or mutation. Redirects instead of returning when access is denied. */
export const requireStaff = cache(async () => {
  const status = await getStaffStatus();
  if (!status.signedIn) redirect("/sign-in");
  if (!status.allowed) redirect("/no-access");
  return status;
});
