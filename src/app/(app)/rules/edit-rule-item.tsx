"use client";

import { Pencil } from "lucide-react";
import { MenuItemTrigger } from "@/components/ui/menu-item-trigger";
import { RuleFormDialog, type RuleDefaults } from "./rule-form-dialog";

export function EditRuleItem({ rule }: { rule: RuleDefaults }) {
  return (
    <RuleFormDialog
      rule={rule}
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
