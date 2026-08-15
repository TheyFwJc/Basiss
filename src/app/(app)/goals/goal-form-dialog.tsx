"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGoalAction, updateGoalAction, type ActionState } from "./actions";
import { METRIC_LABELS, PERIOD_LABELS } from "./goal-labels";

export type GoalDefaults = {
  id: string;
  metric: string;
  period: string;
  targetValue: string;
};

export function GoalFormDialog({
  trigger,
  triggerIsNativeButton = true,
  goal,
}: {
  trigger: React.ReactElement;
  triggerIsNativeButton?: boolean;
  goal?: GoalDefaults;
}) {
  const isEdit = !!goal;
  const action = isEdit ? updateGoalAction : createGoalAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null
  );
  const [open, setOpen] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (pending) submittedRef.current = true;
    if (!pending && submittedRef.current && state === null) {
      setOpen(false);
      submittedRef.current = false;
    }
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} nativeButton={triggerIsNativeButton} />
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit goal" : "New goal"}</DialogTitle>
            <DialogDescription>
              Set a target for a metric over a recurring period — progress is
              tracked against your actual trades.
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={goal.id} />}

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="metric">Metric</Label>
              <Select
                name="metric"
                items={METRIC_LABELS}
                defaultValue={goal?.metric ?? "MONTHLY_PNL_TARGET"}
              >
                <SelectTrigger id="metric" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="period">Period</Label>
                <Select
                  name="period"
                  items={PERIOD_LABELS}
                  defaultValue={goal?.period ?? "MONTHLY"}
                >
                  <SelectTrigger id="period" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="targetValue">Target</Label>
                <Input
                  id="targetValue"
                  name="targetValue"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={goal?.targetValue}
                  required
                />
              </div>
            </div>

            {state?.error && <p className="text-sm text-loss">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
