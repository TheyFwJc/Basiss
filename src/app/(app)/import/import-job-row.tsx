"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteImportJobAction } from "./actions";

export function DeleteImportJobButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7"
      disabled={pending}
      onClick={() => startTransition(() => deleteImportJobAction(id))}
      aria-label="Remove from history"
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
