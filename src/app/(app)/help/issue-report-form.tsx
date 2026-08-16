"use client";

import * as React from "react";
import { CheckCircle2, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitIssueReportAction } from "./issue-report-actions";

export function IssueReportForm() {
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitIssueReportAction(
        description,
        window.location.href,
        navigator.userAgent
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
      setDescription("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Flag className="size-4 text-primary" />
          Report an issue
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {submitted ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-profit" />
            <span>
              Thanks — that&apos;s been logged.{" "}
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="underline"
              >
                Report another
              </button>
              .
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Found a bug, or something looks wrong? Describe what happened — the
              page you&apos;re on and your browser are included automatically.
            </p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect instead?"
              rows={3}
              className="resize-none"
            />
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button type="submit" size="sm" disabled={pending || !description.trim()} className="self-start">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit report"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
