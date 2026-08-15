"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRiskSettingsAction } from "./actions";

export function RiskSettingsForm({
  defaultRiskPerTradePct,
  maxDailyLossPct,
  maxWeeklyLossPct,
}: {
  defaultRiskPerTradePct: string;
  maxDailyLossPct: string;
  maxWeeklyLossPct: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateRiskSettingsAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="defaultRiskPerTradePct">Default risk per trade (%)</Label>
          <Input
            id="defaultRiskPerTradePct"
            name="defaultRiskPerTradePct"
            type="number"
            step="any"
            min="0"
            max="100"
            defaultValue={defaultRiskPerTradePct}
            placeholder="e.g. 1"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxDailyLossPct">Max daily loss (%)</Label>
          <Input
            id="maxDailyLossPct"
            name="maxDailyLossPct"
            type="number"
            step="any"
            min="0"
            max="100"
            defaultValue={maxDailyLossPct}
            placeholder="e.g. 3"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxWeeklyLossPct">Max weekly loss (%)</Label>
          <Input
            id="maxWeeklyLossPct"
            name="maxWeeklyLossPct"
            type="number"
            step="any"
            min="0"
            max="100"
            defaultValue={maxWeeklyLossPct}
            placeholder="e.g. 6"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Percentages are of your combined starting balance across accounts.
      </p>
      {state?.error && <p className="text-sm text-loss">{state.error}</p>}
      {state?.message && <p className="text-sm text-profit">{state.message}</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save risk settings"}
        </Button>
      </div>
    </form>
  );
}
