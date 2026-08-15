"use client";

import { Pencil } from "lucide-react";
import { MenuItemTrigger } from "@/components/ui/menu-item-trigger";
import { GoalFormDialog, type GoalDefaults } from "./goal-form-dialog";

export function EditGoalItem({ goal }: { goal: GoalDefaults }) {
  return (
    <GoalFormDialog
      goal={goal}
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
