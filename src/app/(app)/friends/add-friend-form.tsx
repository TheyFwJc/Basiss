"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendFriendRequestAction } from "./actions";

export function AddFriendForm() {
  const [state, formAction, pending] = useActionState(sendFriendRequestAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="friend-email">Email</Label>
        <Input
          id="friend-email"
          name="email"
          type="email"
          placeholder="friend@example.com"
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Sending…" : "Send request"}
      </Button>
      {state?.error && <p className="text-sm text-loss sm:basis-full">{state.error}</p>}
      {state?.message && <p className="text-sm text-profit sm:basis-full">{state.message}</p>}
    </form>
  );
}
