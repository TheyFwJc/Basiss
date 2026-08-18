"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MenuItemTrigger } from "@/components/ui/menu-item-trigger";
import { useDropdownMenuClose } from "@/components/ui/dropdown-menu";
import { deleteGoalAction } from "./actions";

export function DeleteGoalButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const closeDropdownMenu = useDropdownMenuClose();

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) closeDropdownMenu?.();
      }}
    >
      <AlertDialogTrigger
        nativeButton={false}
        render={
          <MenuItemTrigger variant="destructive">
            <Trash2 className="size-4" />
            Delete
          </MenuItemTrigger>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{label}&rdquo; goal?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => startTransition(() => deleteGoalAction(id))}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
