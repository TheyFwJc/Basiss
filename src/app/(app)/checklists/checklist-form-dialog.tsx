"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createChecklistAction,
  updateChecklistAction,
  type ActionState,
} from "./actions";

export type ChecklistDefaults = {
  id: string;
  name: string;
  playbookId: string | null;
  items: { label: string }[];
};

let rowKeySeq = 0;

export function ChecklistFormDialog({
  trigger,
  triggerIsNativeButton = true,
  playbooks,
  checklist,
}: {
  trigger: React.ReactElement;
  triggerIsNativeButton?: boolean;
  playbooks: { id: string; name: string }[];
  checklist?: ChecklistDefaults;
}) {
  const isEdit = !!checklist;
  const action = isEdit ? updateChecklistAction : createChecklistAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null
  );
  const [open, setOpen] = useState(false);
  const submittedRef = useRef(false);
  const closeDropdownMenu = useDropdownMenuClose();
  const [rows, setRows] = useState<{ key: number; label: string }[]>(
    () =>
      checklist?.items.map((item) => ({ key: rowKeySeq++, label: item.label })) ?? [
        { key: rowKeySeq++, label: "" },
      ]
  );

  const playbookItems = Object.fromEntries(playbooks.map((p) => [p.id, p.name]));

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
            <DialogTitle>{isEdit ? "Edit checklist" : "New checklist"}</DialogTitle>
            <DialogDescription>
              A reusable list of steps to confirm before or during a trade —
              optionally tied to a playbook.
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={checklist.id} />}

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Pre-entry checklist"
                defaultValue={checklist?.name}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="playbookId">Playbook (optional)</Label>
              <Select
                name="playbookId"
                items={playbookItems}
                defaultValue={checklist?.playbookId ?? ""}
              >
                <SelectTrigger id="playbookId" className="w-full">
                  <SelectValue placeholder="No playbook" />
                </SelectTrigger>
                <SelectContent>
                  {playbooks.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    setRows((r) => [...r, { key: rowKeySeq++, label: "" }])
                  }
                >
                  <Plus className="size-3" />
                  Add item
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {rows.map((row) => (
                  <div key={row.key} className="flex items-center gap-2">
                    <Input
                      name="itemLabel"
                      defaultValue={row.label}
                      placeholder="e.g. Checked the higher timeframe trend"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      disabled={rows.length === 1}
                      onClick={() =>
                        setRows((r) => r.filter((x) => x.key !== row.key))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {state?.error && <p className="text-sm text-loss">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create checklist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
