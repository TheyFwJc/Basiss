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
import { useDropdownMenuClose } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createStrategyAction,
  updateStrategyAction,
  type ActionState,
} from "./actions";

export type StrategyDefaults = {
  id: string;
  name: string;
  description: string | null;
  entryCriteria: string | null;
  exitCriteria: string | null;
  stopLossRules: string | null;
  takeProfitRules: string | null;
  timeframe: string | null;
  marketConditions: string | null;
};

export function StrategyFormDialog({
  trigger,
  triggerIsNativeButton = true,
  strategy,
}: {
  trigger: React.ReactElement;
  triggerIsNativeButton?: boolean;
  strategy?: StrategyDefaults;
}) {
  const isEdit = !!strategy;
  const action = isEdit ? updateStrategyAction : createStrategyAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null
  );
  const [open, setOpen] = useState(false);
  const submittedRef = useRef(false);
  const closeDropdownMenu = useDropdownMenuClose();

  useEffect(() => {
    if (pending) submittedRef.current = true;
    if (!pending && submittedRef.current && state === null) {
      setOpen(false);
      closeDropdownMenu?.();
      submittedRef.current = false;
    }
  }, [pending, state, closeDropdownMenu]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) closeDropdownMenu?.();
      }}
    >
      <DialogTrigger render={trigger} nativeButton={triggerIsNativeButton} />
      <DialogContent className="sm:max-w-lg">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit strategy" : "New strategy"}
            </DialogTitle>
            <DialogDescription>
              Define the rules for a strategy so you can track how it performs.
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={strategy.id} />}

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Opening Range Breakout"
                defaultValue={strategy?.name}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={strategy?.description ?? ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="entryCriteria">Entry criteria (optional)</Label>
                <Textarea
                  id="entryCriteria"
                  name="entryCriteria"
                  rows={3}
                  defaultValue={strategy?.entryCriteria ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="exitCriteria">Exit criteria (optional)</Label>
                <Textarea
                  id="exitCriteria"
                  name="exitCriteria"
                  rows={3}
                  defaultValue={strategy?.exitCriteria ?? ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="stopLossRules">Stop-loss rules (optional)</Label>
                <Textarea
                  id="stopLossRules"
                  name="stopLossRules"
                  rows={2}
                  defaultValue={strategy?.stopLossRules ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="takeProfitRules">
                  Take-profit rules (optional)
                </Label>
                <Textarea
                  id="takeProfitRules"
                  name="takeProfitRules"
                  rows={2}
                  defaultValue={strategy?.takeProfitRules ?? ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="timeframe">Timeframe (optional)</Label>
                <Input
                  id="timeframe"
                  name="timeframe"
                  placeholder="e.g. 5m"
                  defaultValue={strategy?.timeframe ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="marketConditions">
                  Market conditions (optional)
                </Label>
                <Input
                  id="marketConditions"
                  name="marketConditions"
                  placeholder="e.g. Trending, high volume"
                  defaultValue={strategy?.marketConditions ?? ""}
                />
              </div>
            </div>

            {state?.error && <p className="text-sm text-loss">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create strategy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
