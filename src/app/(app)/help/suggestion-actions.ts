"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export type SubmitSuggestionResult = { error: string } | { ok: true };

const MAX_DESCRIPTION_LENGTH = 4000;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

/** Saves a user-submitted feature idea. Reviewed on /admin under its own tab,
 * alongside issue reports — same pattern, separate table. */
export async function submitSuggestionAction(
  description: string,
  pageUrl: string
): Promise<SubmitSuggestionResult> {
  const userId = await requireUserId();

  const trimmed = description.trim();
  if (!trimmed) {
    return { error: "Describe your idea before submitting." };
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    return { error: `Keep it under ${MAX_DESCRIPTION_LENGTH} characters.` };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { subscriptionPlan: true },
  });

  await db.suggestion.create({
    data: {
      userId,
      description: trimmed,
      pageUrl: pageUrl.slice(0, 500),
      plan: user.subscriptionPlan,
    },
  });

  return { ok: true };
}
