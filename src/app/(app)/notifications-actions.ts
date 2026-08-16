"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function markNotificationReadAction(id: string) {
  const userId = await requireUserId();
  await db.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const userId = await requireUserId();
  await db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}
