"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

/** Marks the current user as past the first-run welcome screen so it never
 * shows again — called once the "Let's go" click animation finishes. */
export async function completeWelcomeAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await db.user.update({
    where: { id: session.user.id },
    data: { welcomedAt: new Date() },
  });
}
