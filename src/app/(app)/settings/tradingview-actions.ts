"use server";

import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { AssetClass } from "@/lib/import";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function baseUrl() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export type CreateWebhookResult = { error: string } | { url: string; label: string };

/** Creates a new TradingView webhook and returns its full URL — the ONLY
 * time the raw token is ever available, since only its hash is stored. */
export async function createTradingViewWebhookAction(
  tradingAccountId: string,
  label: string,
  defaultAssetClass: AssetClass
): Promise<CreateWebhookResult> {
  const userId = await requireUserId();

  const trimmedLabel = label.trim();
  if (!trimmedLabel) return { error: "Give this webhook a label." };

  const account = await db.tradingAccount.findFirst({
    where: { id: tradingAccountId, userId },
  });
  if (!account) return { error: "Trading account not found." };

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await db.tradingViewWebhook.create({
    data: {
      userId,
      tradingAccountId,
      label: trimmedLabel,
      tokenHash,
      defaultAssetClass,
    },
  });

  revalidatePath("/settings");
  return { url: `${baseUrl()}/api/tradingview/webhook/${rawToken}`, label: trimmedLabel };
}

export async function deleteTradingViewWebhookAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await db.tradingViewWebhook.deleteMany({ where: { id, userId } });
  revalidatePath("/settings");
}
