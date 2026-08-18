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
  createMistakeAction,
  updateMistakeAction,
  type ActionState,
} from "./actions";

export type MistakeDefaults = {
  id: string;
  name: string;
  description: string | null;
};

export function MistakeFormDialog({
  trigger,
  triggerIsNativeButton = true,
  mistake,
}: {
  trigger: React.ReactElement;
  triggerIsNativeButton?: boolean;
  mistake?: MistakeDefaults;
}) {
  const isEdit = !!mistake;
  const action = isEdit ? updateMistakeAction : createMistakeAction;
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
            <DialogTitle>{isEdit ? "Edit mistake" : "New mistake"}</DialogTitle>
            <DialogDescription>
              Track a recurring mistake so you can tag trades with it and see
              how often — and how expensive — it is.
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={mistake.id} />}

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Moved stop loss"
                defaultValue={mistake?.name}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={mistake?.description ?? ""}
              />
            </div>

            {state?.error && <p className="text-sm text-loss">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create mistake"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
