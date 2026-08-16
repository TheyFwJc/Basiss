"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setIssueResolvedAction } from "./actions";

export function ResolveToggle({ id, resolved }: { id: string; resolved: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={resolved ? "outline" : "default"}
      disabled={pending}
      onClick={() => startTransition(() => setIssueResolvedAction(id, !resolved))}
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
