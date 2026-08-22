"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ACCOUNT_SCOPE_COOKIE } from "@/lib/account-scope";

/** Sets (or clears, for "all accounts") the global account-scope cookie
 * that dashboard/calendar/analytics/risk/goals/insights read to decide
 * whether to aggregate every trading account or just one. */
export async function setAccountScopeAction(accountId: string | null) {
  const session = await auth();
  const userId = session!.user.id;
  const store = await cookies();

  if (accountId) {
    const owned = await db.tradingAccount.findFirst({
      where: { id: accountId, userId },
      select: { id: true },
    });
    if (!owned) return;
    store.set(ACCOUNT_SCOPE_COOKIE, accountId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
    });
  } else {
    store.delete(ACCOUNT_SCOPE_COOKIE);
  }

  revalidatePath("/", "layout");
}
