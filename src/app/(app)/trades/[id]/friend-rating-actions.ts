"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { areFriends } from "@/lib/friendship";
import { notifyUser } from "@/lib/notify";

export type ActionState = { error?: string; message?: string } | null;

export async function rateFriendTradeAction(
  tradeId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  const raterId = session?.user?.id;
  if (!raterId) return { error: "Not authenticated." };

  const rating = Number(formData.get("rating"));
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pick a rating from 1 to 5." };
  }

  const trade = await db.trade.findUnique({
    where: { id: tradeId },
    select: {
      id: true,
      userId: true,
      symbol: true,
      user: { select: { email: true, settings: { select: { notificationsEnabled: true } } } },
    },
  });
  if (!trade) return { error: "Trade not found." };
  if (trade.userId === raterId) return { error: "You can't rate your own trade." };
  if (!(await areFriends(raterId, trade.userId))) {
    return { error: "You can only rate a friend's trade." };
  }

  const ratingRow = await db.tradeRating.upsert({
    where: { tradeId_raterId: { tradeId, raterId } },
    create: { tradeId, raterId, rating, note },
    update: { rating, note },
  });

  const rater = await db.user.findUniqueOrThrow({ where: { id: raterId }, select: { name: true, email: true } });
  const raterName = rater.name ?? rater.email;
  await notifyUser({
    userId: trade.userId,
    recipientEmail: trade.user.email,
    emailEnabled: trade.user.settings?.notificationsEnabled ?? true,
    type: "TRADE_RATED",
    message: `${raterName} rated your ${trade.symbol} trade.`,
    dedupeKey: `trade-rating:${ratingRow.id}:${ratingRow.updatedAt.getTime()}`,
    link: `/trades/${tradeId}`,
    emailSubject: `${raterName} rated your ${trade.symbol} trade on Basis`,
    emailHtml: `<p>${raterName} rated your ${trade.symbol} trade ${rating}/5${note ? `: "${note}"` : "."}</p><p><a href="${process.env.AUTH_URL ?? "http://localhost:3000"}/trades/${tradeId}">View the trade</a></p>`,
  });

  revalidatePath(`/trades/${tradeId}`);
  return { message: "Rating saved." };
}
