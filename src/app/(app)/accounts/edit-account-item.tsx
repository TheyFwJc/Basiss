"use client";

import { Pencil } from "lucide-react";
import { MenuItemTrigger } from "@/components/ui/menu-item-trigger";
import {
  AccountFormDialog,
  type TradingAccountDefaults,
} from "./account-form-dialog";

export function EditAccountItem({ account }: { account: TradingAccountDefaults }) {
  return (
    <AccountFormDialog
      account={account}
      triggerIsNativeButton={false}
      trigger={
        <MenuItemTrigger>
          <Pencil className="size-4" />
          Edit
        </MenuItemTrigger>
      }
    />
  );
}
