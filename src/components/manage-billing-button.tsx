"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortalSessionAction } from "@/app/(app)/pricing/actions";

export function ManageBillingButton({
  variant = "outline",
  size = "sm",
  className,
}: {
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createPortalSessionAction();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.assign(result.url);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={pending}
        onClick={handleClick}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Manage Billing
      </Button>
      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  );
}
