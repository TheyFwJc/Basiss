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
import { createRuleAction, updateRuleAction, type ActionState } from "./actions";

export type RuleDefaults = {
  id: string;
  name: string;
  description: string | null;
};

export function RuleFormDialog({
  trigger,
  triggerIsNativeButton = true,
  rule,
}: {
  trigger: React.ReactElement;
  triggerIsNativeButton?: boolean;
  rule?: RuleDefaults;
}) {
  const isEdit = !!rule;
  const action = isEdit ? updateRuleAction : createRuleAction;
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
            <DialogTitle>{isEdit ? "Edit rule" : "New rule"}</DialogTitle>
            <DialogDescription>
              A personal trading rule to keep yourself honest — this is just a
              reference list, not linked to any trade.
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={rule.id} />}

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Rule</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. No trades in the last 30 minutes"
                defaultValue={rule?.name}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={rule?.description ?? ""}
              />
            </div>

            {state?.error && <p className="text-sm text-loss">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
