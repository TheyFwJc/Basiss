import { db } from "@/lib/db";

/** True once a Friendship row between the two users exists and is ACCEPTED,
 * regardless of who originally sent the request. */
export async function areFriends(userIdA: string, userIdB: string): Promise<boolean> {
  if (userIdA === userIdB) return false;
  const friendship = await db.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userIdA, receiverId: userIdB },
        { requesterId: userIdB, receiverId: userIdA },
      ],
    },
    select: { id: true },
  });
  return !!friendship;
}

/** A trade is visible to its owner, and to anyone who's an accepted friend
 * of the owner. */
export async function canViewTrade(
  viewerId: string,
  trade: { userId: string }
): Promise<boolean> {
  if (trade.userId === viewerId) return true;
  return areFriends(viewerId, trade.userId);
}
