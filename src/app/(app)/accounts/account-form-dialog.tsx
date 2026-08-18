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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTradingAccountAction,
  updateTradingAccountAction,
  type ActionState,
} from "./actions";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BROKERAGE: "Brokerage",
  FUTURES: "Futures",
  FOREX: "Forex",
  CRYPTO: "Crypto",
  PROP_FIRM: "Prop firm",
  PAPER: "Paper trading",
  OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  CLOSED: "Closed",
};

export type TradingAccountDefaults = {
  id: string;
  name: string;
  broker: string | null;
  accountType: string;
  startingBalance: string;
  currency: string;
  status: string;
  notes: string | null;
};

export function AccountFormDialog({
  trigger,
  triggerIsNativeButton = true,
  account,
}: {
  trigger: React.ReactElement;
  /** Set to false when `trigger` isn't a real `<button>` (e.g. a DropdownMenuItem). */
  triggerIsNativeButton?: boolean;
  account?: TradingAccountDefaults;
}) {
  const isEdit = !!account;
  const action = isEdit ? updateTradingAccountAction : createTradingAccountAction;
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
      // This bypasses the Dialog's own onOpenChange (that only fires for
      // Base UI's own close interactions, not this externally-driven
      // setOpen), so the ambient dropdown menu — which stays open, invisibly,
      // behind this dialog while editing — needs closing here too.
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
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit trading account" : "Add trading account"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the details for this account."
                : "Create a brokerage, futures, forex, crypto, prop firm, or paper account."}
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={account.id} />}

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Main brokerage"
                defaultValue={account?.name}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="accountType">Account type</Label>
                <Select
                  name="accountType"
                  items={ACCOUNT_TYPE_LABELS}
                  defaultValue={account?.accountType ?? "BROKERAGE"}
                >
                  <SelectTrigger id="accountType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  name="status"
                  items={STATUS_LABELS}
                  defaultValue={account?.status ?? "ACTIVE"}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="broker">Broker / platform (optional)</Label>
              <Input
                id="broker"
                name="broker"
                placeholder="e.g. Interactive Brokers"
                defaultValue={account?.broker ?? ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="startingBalance">Starting balance</Label>
                <Input
                  id="startingBalance"
                  name="startingBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={account?.startingBalance}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  name="currency"
                  maxLength={3}
                  defaultValue={account?.currency ?? "USD"}
                  className="uppercase"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={account?.notes ?? ""}
              />
            </div>

            {state?.error && <p className="text-sm text-loss">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
