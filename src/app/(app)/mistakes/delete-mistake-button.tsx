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
import { deleteMistakeAction } from "./actions";

export function DeleteMistakeButton({ id, name }: { id: string; name: string }) {
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
          <AlertDialogTitle>Delete &ldquo;{name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            Trades already tagged with this mistake will keep their history,
            but will no longer be linked to it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => startTransition(() => deleteMistakeAction(id))}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
