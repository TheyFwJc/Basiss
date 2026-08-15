"use client";

import { useTransition, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateInsightsAction } from "./actions";

const LOADING_MESSAGES = [
  "Reviewing your trade history…",
  "Looking for patterns across symbols, sessions, and setups…",
  "Checking whether psychology ratings line up with outcomes…",
  "Writing up what stands out…",
];

export function InsightsPanel() {
  const [pending, startTransition] = useTransition();
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  function handleGenerate() {
    setError(null);
    let i = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[i]);
    }, 4000);

    startTransition(async () => {
      const result = await generateInsightsAction();
      clearInterval(interval);
      if ("error" in result) {
        setError(result.error);
        setInsight(null);
      } else {
        setInsight(result.insight);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button type="button" onClick={handleGenerate} disabled={pending}>
          <Sparkles className="size-4" />
          {pending ? "Analyzing…" : insight ? "Regenerate insights" : "Ask for insights"}
        </Button>
      </div>

      {pending && (
        <p className="text-sm text-muted-foreground">{loadingMessage}</p>
      )}

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-loss">{error}</CardContent>
        </Card>
      )}

      {insight && (
        <Card>
          <CardContent className="whitespace-pre-wrap p-6 text-sm leading-relaxed">
            {insight}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
