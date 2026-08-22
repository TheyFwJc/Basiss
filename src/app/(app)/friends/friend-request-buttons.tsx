"use client";

import { useTransition } from "react";
import { Check, X, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  acceptFriendRequestAction,
  declineFriendRequestAction,
  cancelFriendRequestAction,
  removeFriendAction,
} from "./actions";

export function AcceptDeclineButtons({ friendshipId }: { friendshipId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="outline"
        disabled={pending}
        aria-label="Accept"
        onClick={() => startTransition(() => acceptFriendRequestAction(friendshipId))}
      >
        <Check className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        disabled={pending}
        aria-label="Decline"
        onClick={() => startTransition(() => declineFriendRequestAction(friendshipId))}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export function CancelRequestButton({ friendshipId }: { friendshipId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => cancelFriendRequestAction(friendshipId))}
    >
      Cancel
    </Button>
  );
}

export function RemoveFriendButton({ friendshipId }: { friendshipId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={pending}
      aria-label="Remove friend"
      onClick={() => startTransition(() => removeFriendAction(friendshipId))}
    >
      <UserMinus className="size-4" />
    </Button>
  );
}
