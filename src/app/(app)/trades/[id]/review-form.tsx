"use client";

import { useActionState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateTradeReviewAction } from "./actions";

export function ReviewForm({
  tradeId,
  reviewWhatWentWell,
  reviewWhatWentWrong,
  reviewWhatToChange,
}: {
  tradeId: string;
  reviewWhatWentWell: string | null;
  reviewWhatWentWrong: string | null;
  reviewWhatToChange: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateTradeReviewAction.bind(null, tradeId),
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="reviewWhatWentWell">What went well?</Label>
        <Textarea
          id="reviewWhatWentWell"
          name="reviewWhatWentWell"
          rows={2}
          defaultValue={reviewWhatWentWell ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reviewWhatWentWrong">What went wrong?</Label>
        <Textarea
          id="reviewWhatWentWrong"
          name="reviewWhatWentWrong"
          rows={2}
          defaultValue={reviewWhatWentWrong ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reviewWhatToChange">What would I change?</Label>
        <Textarea
          id="reviewWhatToChange"
          name="reviewWhatToChange"
          rows={2}
          defaultValue={reviewWhatToChange ?? ""}
        />
      </div>
      {state?.error && <p className="text-sm text-loss">{state.error}</p>}
      {state?.message && <p className="text-sm text-profit">{state.message}</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save review"}
        </Button>
      </div>
    </form>
  );
}
