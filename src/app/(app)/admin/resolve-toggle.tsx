"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResolveToggle({
  id,
  resolved,
  action,
}: {
  id: string;
  resolved: boolean;
  action: (id: string, resolved: boolean) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={resolved ? "outline" : "default"}
      disabled={pending}
      onClick={() => startTransition(() => action(id, !resolved))}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : resolved ? (
        "Reopen"
      ) : (
        "Mark resolved"
      )}
    </Button>
  );
}
