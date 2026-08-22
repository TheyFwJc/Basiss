"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { rateFriendTradeAction, type ActionState } from "./friend-rating-actions";

const RATING_OPTIONS = ["1", "2", "3", "4", "5"];

type Rating = {
  id: string;
  raterId: string;
  raterName: string;
  rating: number;
  note: string | null;
  createdAt: string;
};

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5 text-primary">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="size-3.5" fill={i < value ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export function FriendRatings({
  tradeId,
  ratings,
  viewerId,
  canRate,
}: {
  tradeId: string;
  ratings: Rating[];
  viewerId: string;
  canRate: boolean;
}) {
  const myRating = ratings.find((r) => r.raterId === viewerId);
  const [rating, setRating] = useState(myRating ? String(myRating.rating) : "5");
  const action = (_prev: ActionState, formData: FormData) =>
    rateFriendTradeAction(tradeId, _prev, formData);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="flex flex-col gap-4">
      {ratings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ratings yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ratings.map((r) => (
            <div key={r.id} className="flex flex-col gap-1 rounded-md border border-border px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.raterName}</span>
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                </div>
              </div>
              {r.note && <p className="text-sm text-muted-foreground">{r.note}</p>}
            </div>
          ))}
        </div>
      )}

      {canRate && (
        <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm font-medium">{myRating ? "Update your rating" : "Rate this trade"}</p>
          <div className="flex flex-col gap-2 sm:w-32">
            <Label>Rating</Label>
            <input type="hidden" name="rating" value={rating} />
            <Select value={rating} onValueChange={(v) => v && setRating(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" name="note" rows={2} defaultValue={myRating?.note ?? ""} />
          </div>
          {state?.error && <p className="text-sm text-loss">{state.error}</p>}
          {state?.message && <p className="text-sm text-profit">{state.message}</p>}
          <div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : myRating ? "Update rating" : "Save rating"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
