"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export type SubmitIssueReportResult = { error: string } | { ok: true };

const MAX_DESCRIPTION_LENGTH = 4000;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

/** Saves a user-submitted bug/feedback report. No email/notification wiring
 * yet — reports are just rows in the DB, queried directly until volume
 * justifies an admin view. */
export async function submitIssueReportAction(
  description: string,
  pageUrl: string,
  userAgent: string
): Promise<SubmitIssueReportResult> {
  const userId = await requireUserId();

  const trimmed = description.trim();
  if (!trimmed) {
    return { error: "Describe the issue before submitting." };
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    return { error: `Keep it under ${MAX_DESCRIPTION_LENGTH} characters.` };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { subscriptionPlan: true },
  });

  await db.issueReport.create({
    data: {
      userId,
      description: trimmed,
      pageUrl: pageUrl.slice(0, 500),
      userAgent: userAgent.slice(0, 500) || null,
      plan: user.subscriptionPlan,
    },
  });

  return { ok: true };
}
