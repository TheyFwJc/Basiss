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
  createPlaybookAction,
  updatePlaybookAction,
  type ActionState,
} from "./actions";

export type PlaybookDefaults = {
  id: string;
  name: string;
  setupDescription: string | null;
  entryRules: string | null;
  stopRules: string | null;
  targetRules: string | null;
  invalidations: string | null;
};

export function PlaybookFormDialog({
  trigger,
  triggerIsNativeButton = true,
  playbook,
}: {
  trigger: React.ReactElement;
  triggerIsNativeButton?: boolean;
  playbook?: PlaybookDefaults;
}) {
  const isEdit = !!playbook;
  const action = isEdit ? updatePlaybookAction : createPlaybookAction;
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
            <DialogTitle>{isEdit ? "Edit playbook" : "New playbook"}</DialogTitle>
            <DialogDescription>
              Codify a setup — entry, stop, target, and what invalidates it.
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={playbook.id} />}

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Opening Range Breakout"
                defaultValue={playbook?.name}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="setupDescription">Setup description (optional)</Label>
              <Textarea
                id="setupDescription"
                name="setupDescription"
                rows={2}
                defaultValue={playbook?.setupDescription ?? ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="entryRules">Entry rules (optional)</Label>
                <Textarea
                  id="entryRules"
                  name="entryRules"
                  rows={3}
                  defaultValue={playbook?.entryRules ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="stopRules">Stop rules (optional)</Label>
                <Textarea
                  id="stopRules"
                  name="stopRules"
                  rows={3}
                  defaultValue={playbook?.stopRules ?? ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="targetRules">Target rules (optional)</Label>
                <Textarea
                  id="targetRules"
                  name="targetRules"
                  rows={2}
                  defaultValue={playbook?.targetRules ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invalidations">Invalidations (optional)</Label>
                <Textarea
                  id="invalidations"
                  name="invalidations"
                  rows={2}
                  defaultValue={playbook?.invalidations ?? ""}
                />
              </div>
            </div>

            {state?.error && <p className="text-sm text-loss">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create playbook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
