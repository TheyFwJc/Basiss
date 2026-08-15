"use client";

import { Pencil } from "lucide-react";
import { MenuItemTrigger } from "@/components/ui/menu-item-trigger";
import {
  StrategyFormDialog,
  type StrategyDefaults,
} from "./strategy-form-dialog";

export function EditStrategyItem({ strategy }: { strategy: StrategyDefaults }) {
  return (
    <StrategyFormDialog
      strategy={strategy}
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
