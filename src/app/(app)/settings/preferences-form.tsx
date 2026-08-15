"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePreferencesAction } from "./actions";

export function PreferencesForm({
  timezone,
  baseCurrency,
}: {
  timezone: string;
  baseCurrency: string;
}) {
  const [state, formAction, pending] = useActionState(
    updatePreferencesAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue={timezone}
            placeholder="America/New_York"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="baseCurrency">Base currency</Label>
          <Input
            id="baseCurrency"
            name="baseCurrency"
            defaultValue={baseCurrency}
            maxLength={3}
            className="uppercase"
            required
          />
        </div>
      </div>
      {state?.error && <p className="text-sm text-loss">{state.error}</p>}
      {state?.message && <p className="text-sm text-profit">{state.message}</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}
