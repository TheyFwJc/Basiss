"use client";

import { Pencil } from "lucide-react";
import { MenuItemTrigger } from "@/components/ui/menu-item-trigger";
import {
  PlaybookFormDialog,
  type PlaybookDefaults,
} from "./playbook-form-dialog";

export function EditPlaybookItem({ playbook }: { playbook: PlaybookDefaults }) {
  return (
    <PlaybookFormDialog
      playbook={playbook}
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
