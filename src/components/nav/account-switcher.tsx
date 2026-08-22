"use client";

import { useTransition } from "react";
import { Wallet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setAccountScopeAction } from "@/app/(app)/account-scope-actions";

/**
 * Global "which account am I looking at" control, rendered once in the app
 * header so it's reachable from every page without opening the mobile nav
 * drawer. Persists via a cookie (see setAccountScopeAction), unlike the
 * per-page filters on /trades and /analytics which reset on navigation.
 */
export function AccountSwitcher({
  accounts,
  selectedAccountId,
}: {
  accounts: { id: string; name: string }[];
  selectedAccountId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={selectedAccountId ?? "all"}
      items={{
        all: "All accounts",
        ...Object.fromEntries(accounts.map((a) => [a.id, a.name])),
      }}
      onValueChange={(v) =>
        startTransition(() => setAccountScopeAction(!v || v === "all" ? null : v))
      }
      disabled={pending}
    >
      <SelectTrigger className="w-36 gap-1.5 sm:w-52" aria-label="Account scope">
        <Wallet className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="All accounts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All accounts</SelectItem>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
