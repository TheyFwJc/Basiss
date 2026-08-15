"use client";

import { Pencil } from "lucide-react";
import { MenuItemTrigger } from "@/components/ui/menu-item-trigger";
import { MistakeFormDialog, type MistakeDefaults } from "./mistake-form-dialog";

export function EditMistakeItem({ mistake }: { mistake: MistakeDefaults }) {
  return (
    <MistakeFormDialog
      mistake={mistake}
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
