"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { PLANS, yearlySavingsPercent, type Plan } from "@/lib/plans";
import {
  createCheckoutSessionAction,
  changePlanAction,
  createPortalSessionAction,
} from "./actions";

type Interval = "MONTHLY" | "YEARLY";

const PLAN_ORDER: Plan[] = ["FREE", "PRO", "PRO_PLUS"];

function priceFor(plan: Plan, interval: Interval): number {
  return interval === "MONTHLY" ? PLANS[plan].monthlyPrice : PLANS[plan].yearlyPrice;
}

export function PricingCards({
  currentPlan,
  currentInterval,
}: {
  currentPlan: Plan | null;
  currentInterval: Interval | null;
}) {
  const [interval, setInterval] = useState<Interval>(currentInterval ?? "MONTHLY");
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function goToUrl(url: string) {
    window.location.assign(url);
  }

  function handleUpgrade(plan: "PRO" | "PRO_PLUS") {
    setError(null);
    setPendingPlan(plan);
    startTransition(async () => {
      const isSwitchingFromPaid = currentPlan !== "FREE";
      const result = isSwitchingFromPaid
        ? await changePlanAction(plan, interval)
        : await createCheckoutSessionAction(plan, interval);
      if ("error" in result) {
        setError(result.error);
        setPendingPlan(null);
        return;
      }
      goToUrl(result.url);
    });
  }

  function handleManageBilling() {
    setError(null);
    setPendingPlan("FREE");
    startTransition(async () => {
      const result = await createPortalSessionAction();
      if ("error" in result) {
        setError(result.error);
        setPendingPlan(null);
        return;
      }
      goToUrl(result.url);
    });
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-center gap-3 rounded-full border border-border bg-card p-1">
        {(["MONTHLY", "YEARLY"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setInterval(opt)}
            className={cn(
              "relative rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              interval === opt
                ? "bg-brand-gradient text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt === "MONTHLY" ? "Monthly" : "Yearly"}
            {opt === "YEARLY" && (
              <span className="ml-1.5 rounded-full bg-profit-muted px-1.5 py-0.5 text-[10px] font-semibold text-profit">
                Save {yearlySavingsPercent(PLANS.PRO)}%
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-loss/30 bg-loss-muted px-4 py-2 text-sm text-loss">
          {error}
        </p>
      )}

      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const def = PLANS[plan];
          const price = priceFor(plan, interval);
          const isCurrent = currentPlan === plan && (plan === "FREE" || currentInterval === interval);
          const isRecommended = plan === "PRO";
          const isLoading = pending && pendingPlan === plan;

          let ctaLabel: string;
          let onClick: (() => void) | undefined;
          let disabled = false;

          if (currentPlan === null) {
            ctaLabel = plan === "FREE" ? "Sign up free" : `Sign up for ${def.name}`;
          } else if (plan === "FREE") {
            if (currentPlan === "FREE") {
              ctaLabel = "Current Plan";
              disabled = true;
            } else {
              ctaLabel = "Manage Billing";
              onClick = handleManageBilling;
            }
          } else if (isCurrent) {
            ctaLabel = "Current Plan";
            disabled = true;
          } else if (currentPlan === "FREE") {
            ctaLabel = `Upgrade to ${def.name}`;
            onClick = () => handleUpgrade(plan as "PRO" | "PRO_PLUS");
          } else if (currentPlan === "PRO" && plan === "PRO_PLUS") {
            ctaLabel = "Upgrade to Pro+";
            onClick = () => handleUpgrade("PRO_PLUS");
          } else if (currentPlan === plan) {
            // same plan, different interval
            ctaLabel = interval === "MONTHLY" ? "Switch to Monthly" : "Switch to Yearly";
            onClick = () => handleUpgrade(plan as "PRO" | "PRO_PLUS");
          } else {
            ctaLabel = "Manage Billing";
            onClick = handleManageBilling;
          }

          return (
            <Card
              key={plan}
              className={cn(
                "relative flex flex-col",
                isRecommended && "border-primary/50 shadow-lg md:-translate-y-2"
              )}
            >
              {isRecommended && (
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-brand-gradient"
                />
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{def.name}</h3>
                  {isRecommended && (
                    <Badge className="gap-1">
                      <Sparkles className="size-3" />
                      Recommended
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{def.tagline}</p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-numeric text-3xl font-bold tracking-tight">
                    {formatCurrency(price)}
                  </span>
                  {price > 0 && (
                    <span className="mb-1 text-sm text-muted-foreground">
                      /{interval === "MONTHLY" ? "mo" : "yr"}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="flex flex-1 flex-col gap-2">
                  {def.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-profit" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                {currentPlan === null ? (
                  <Button
                    render={<Link href="/signup">{ctaLabel}</Link>}
                    nativeButton={false}
                    variant={isRecommended ? "default" : "outline"}
                    className={cn("w-full", isRecommended && "border-glow")}
                  />
                ) : (
                  <Button
                    type="button"
                    disabled={disabled || pending}
                    onClick={onClick}
                    variant={isRecommended ? "default" : "outline"}
                    className={cn("w-full", isRecommended && !disabled && "border-glow")}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Redirecting…
                      </>
                    ) : (
                      ctaLabel
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
