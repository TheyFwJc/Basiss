"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/notify";

export type ActionState = { error?: string; message?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function appUrl(path: string) {
  return `${process.env.AUTH_URL ?? "http://localhost:3000"}${path}`;
}

export async function sendFriendRequestAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter an email address." };

  const me = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, settings: { select: { notificationsEnabled: true } } },
  });
  if (email === me.email.toLowerCase()) {
    return { error: "You can't add yourself." };
  }

  const target = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, settings: { select: { notificationsEnabled: true } } } });
  if (!target) {
    return { error: "No Basis account found with that email." };
  }

  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, receiverId: target.id },
        { requesterId: target.id, receiverId: userId },
      ],
    },
  });
  if (existing) {
    return {
      error:
        existing.status === "ACCEPTED"
          ? "You're already friends."
          : "A friend request is already pending between you two.",
    };
  }

  const friendship = await db.friendship.create({
    data: { requesterId: userId, receiverId: target.id },
  });

  const requesterName = me.name ?? me.email;
  await notifyUser({
    userId: target.id,
    recipientEmail: target.email,
    emailEnabled: target.settings?.notificationsEnabled ?? true,
    type: "FRIEND_REQUEST_RECEIVED",
    message: `${requesterName} sent you a friend request.`,
    dedupeKey: `friend-request:${friendship.id}`,
    link: "/friends",
    emailSubject: `${requesterName} sent you a friend request on Basis`,
    emailHtml: `<p>${requesterName} (${me.email}) wants to connect on Basis.</p><p><a href="${appUrl("/friends")}">Review the request</a></p>`,
  });

  revalidatePath("/friends");
  return { message: "Friend request sent." };
}

export async function acceptFriendRequestAction(friendshipId: string) {
  const userId = await requireUserId();

  const friendship = await db.friendship.findFirst({
    where: { id: friendshipId, receiverId: userId, status: "PENDING" },
    include: {
      requester: { select: { id: true, name: true, email: true, settings: { select: { notificationsEnabled: true } } } },
    },
  });
  if (!friendship) return;

  await db.friendship.update({
    where: { id: friendship.id },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });

  const me = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } });
  const myName = me.name ?? me.email;
  await notifyUser({
    userId: friendship.requester.id,
    recipientEmail: friendship.requester.email,
    emailEnabled: friendship.requester.settings?.notificationsEnabled ?? true,
    type: "FRIEND_REQUEST_ACCEPTED",
    message: `${myName} accepted your friend request.`,
    dedupeKey: `friend-accept:${friendship.id}`,
    link: `/friends/${userId}`,
    emailSubject: `${myName} accepted your friend request on Basis`,
    emailHtml: `<p>${myName} (${me.email}) accepted your friend request — you can now see each other's trades.</p><p><a href="${appUrl(`/friends/${userId}`)}">View their trades</a></p>`,
  });

  revalidatePath("/friends");
}

export async function declineFriendRequestAction(friendshipId: string) {
  const userId = await requireUserId();
  await db.friendship.deleteMany({
    where: { id: friendshipId, receiverId: userId, status: "PENDING" },
  });
  revalidatePath("/friends");
}

export async function cancelFriendRequestAction(friendshipId: string) {
  const userId = await requireUserId();
  await db.friendship.deleteMany({
    where: { id: friendshipId, requesterId: userId, status: "PENDING" },
  });
  revalidatePath("/friends");
}

export async function removeFriendAction(friendshipId: string) {
  const userId = await requireUserId();
  await db.friendship.deleteMany({
    where: {
      id: friendshipId,
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { receiverId: userId }],
    },
  });
  revalidatePath("/friends");
}
