"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RequestPasswordResetPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter the email on your account and we&apos;ll generate a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          {state?.error && <p className="text-sm text-loss">{state.error}</p>}
          {state?.message && (
            <p className="text-sm text-profit">{state.message}</p>
          )}
          {state?.devResetUrl && (
            <div className="rounded-md border border-dashed border-border bg-muted/50 p-3 text-xs">
              <p className="mb-1 font-medium text-muted-foreground">
                Development mode — no email provider is configured yet, so here&apos;s
                your link:
              </p>
              <Link
                href={state.devResetUrl}
                className="break-all text-primary underline"
              >
                {state.devResetUrl}
              </Link>
            </div>
          )}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
