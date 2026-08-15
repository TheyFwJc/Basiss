"use client";

import { Pencil } from "lucide-react";
import { MenuItemTrigger } from "@/components/ui/menu-item-trigger";
import {
  ChecklistFormDialog,
  type ChecklistDefaults,
} from "./checklist-form-dialog";

export function EditChecklistItem({
  checklist,
  playbooks,
}: {
  checklist: ChecklistDefaults;
  playbooks: { id: string; name: string }[];
}) {
  return (
    <ChecklistFormDialog
      checklist={checklist}
      playbooks={playbooks}
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
