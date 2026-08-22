export const ACCOUNT_SCOPE_COOKIE = "basis_account_scope";

/**
 * Validates a raw cookie value against the accounts the current page already
 * has on hand, so scoping a query never needs an extra DB round-trip and
 * never trusts a client-supplied id blindly.
 */
export function resolveScopedAccountId(
  raw: string | undefined,
  accountIds: string[]
): string | null {
  if (!raw) return null;
  return accountIds.includes(raw) ? raw : null;
}
