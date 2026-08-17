"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user.isAdmin) throw new Error("Not authorized");
}

export async function setIssueResolvedAction(id: string, resolved: boolean): Promise<void> {
  await requireAdmin();
  await db.issueReport.update({ where: { id }, data: { resolved } });
  revalidatePath("/admin");
}

export async function setSuggestionResolvedAction(id: string, resolved: boolean): Promise<void> {
  await requireAdmin();
  await db.suggestion.update({ where: { id }, data: { resolved } });
  revalidatePath("/admin");
}
