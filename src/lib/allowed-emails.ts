// Access is invite-by-email: ALLOWED_EMAILS is a comma/space-separated list set in the host's env vars.
// Unset means nobody is allowed — fail closed.
function allowedEmails() {
  return new Set(
    (process.env.ALLOWED_EMAILS ?? "")
      .split(/[\s,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedEmail(email: string | null | undefined) {
  return Boolean(email) && allowedEmails().has(email!.toLowerCase());
}
