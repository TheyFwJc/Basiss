import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddFriendForm } from "./add-friend-form";
import {
  AcceptDeclineButtons,
  CancelRequestButton,
  RemoveFriendButton,
} from "./friend-request-buttons";

export default async function FriendsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const friendships = await db.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const incoming = friendships.filter((f) => f.receiverId === userId && f.status === "PENDING");
  const outgoing = friendships.filter((f) => f.requesterId === userId && f.status === "PENDING");
  const accepted = friendships.filter((f) => f.status === "ACCEPTED");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Friends"
        description="See each other's trades, and rate and comment on them."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a friend</CardTitle>
          <CardDescription>
            Send a request by email — nothing is visible either direction until they accept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddFriendForm />
        </CardContent>
      </Card>

      {incoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requests</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {incoming.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-md border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{f.requester.name ?? f.requester.email}</p>
                  <p className="text-xs text-muted-foreground">{f.requester.email}</p>
                </div>
                <AcceptDeclineButtons friendshipId={f.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {outgoing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sent requests</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {outgoing.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-md border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{f.receiver.name ?? f.receiver.email}</p>
                  <p className="text-xs text-muted-foreground">Awaiting response</p>
                </div>
                <CancelRequestButton friendshipId={f.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your friends</CardTitle>
        </CardHeader>
        <CardContent>
          {accepted.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No friends yet"
              description="Send a request above to start seeing each other's trades."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {accepted.map((f) => {
                const friend = f.requesterId === userId ? f.receiver : f.requester;
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{friend.name ?? friend.email}</p>
                      <p className="text-xs text-muted-foreground">{friend.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        render={
                          <Link href={`/friends/${friend.id}`}>
                            View trades
                            <ArrowRight className="size-3.5" />
                          </Link>
                        }
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                      />
                      <RemoveFriendButton friendshipId={f.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
