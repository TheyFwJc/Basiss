"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tradingAccountSchema } from "@/lib/validations/trading-account";

export type ActionState = { error?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createTradingAccountAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = tradingAccountSchema.safeParse({
    name: formData.get("name"),
    broker: formData.get("broker"),
    accountType: formData.get("accountType"),
    startingBalance: formData.get("startingBalance"),
    currency: formData.get("currency"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.tradingAccount.create({
    data: {
      userId,
      name: parsed.data.name,
      broker: parsed.data.broker || null,
      accountType: parsed.data.accountType,
      startingBalance: String(parsed.data.startingBalance),
      currency: parsed.data.currency,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/accounts");
  return null;
}

export async function updateTradingAccountAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing account id." };

  const parsed = tradingAccountSchema.safeParse({
    name: formData.get("name"),
    broker: formData.get("broker"),
    accountType: formData.get("accountType"),
    startingBalance: formData.get("startingBalance"),
    currency: formData.get("currency"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { count } = await db.tradingAccount.updateMany({
    where: { id, userId },
    data: {
      name: parsed.data.name,
      broker: parsed.data.broker || null,
      accountType: parsed.data.accountType,
      startingBalance: String(parsed.data.startingBalance),
      currency: parsed.data.currency,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    },
  });
  if (count === 0) return { error: "Account not found." };

  revalidatePath("/accounts");
  return null;
}

export async function deleteTradingAccountAction(id: string) {
  const userId = await requireUserId();
  await db.tradingAccount.deleteMany({ where: { id, userId } });
  revalidatePath("/accounts");
}
