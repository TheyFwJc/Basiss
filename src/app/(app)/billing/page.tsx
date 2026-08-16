import Link from "next/link";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ManageBillingButton } from "@/components/manage-billing-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { getSubscription } from "@/lib/subscription";
import { PLANS, FREE_TRADE_LIMIT } from "@/lib/plans";
import { startOfMonth } from "date-fns";

const STATUS_LABEL: Record<string, string> = {
  FREE: "Free",
  ACTIVE: "Active",
  TRIALING: "Trialing",
  PAST_DUE: "Payment failed",
  CANCELED: "Canceled",
  INCOMPLETE: "Incomplete",
  UNPAID: "Unpaid",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  FREE: "secondary",
  ACTIVE: "default",
  TRIALING: "default",
  PAST_DUE: "destructive",
  CANCELED: "outline",
  INCOMPLETE: "outline",
  UNPAID: "destructive",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const params = await searchParams;

  const [subscription, monthlyTradeCount] = await Promise.all([
    getSubscription(userId),
    db.trade.count({ where: { userId, createdAt: { gte: startOfMonth(new Date()) } } }),
  ]);

  const { effectivePlan, plan, status, billingInterval, currentPeriodEnd, cancelAtPeriodEnd } =
    subscription;
  const planDef = PLANS[effectivePlan];
  const amount =
    plan !== "FREE" && billingInterval
      ? billingInterval === "MONTHLY"
        ? PLANS[plan].monthlyPrice
        : PLANS[plan].yearlyPrice
      : 0;

  const justUpgraded = params.checkout === "success";
  const upgradeStillProcessing = justUpgraded && plan === "FREE";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="Your current plan, billing details, and subscription management."
      />

      {justUpgraded && !upgradeStillProcessing && (
        <div className="flex items-center gap-2 rounded-lg border border-profit/30 bg-profit-muted px-4 py-3 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-profit" />
          <span>
            You&apos;re now on <strong>{planDef.name}</strong>. Welcome to the upgrade.
          </span>
        </div>
      )}
      {upgradeStillProcessing && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            Payment received — we&apos;re still confirming your upgrade with Stripe. This
            usually takes a few seconds.{" "}
            <Link href="/billing" className="underline">
              Refresh
            </Link>
            .
          </span>
        </div>
      )}
      {status === "PAST_DUE" && (
        <div className="flex items-center gap-2 rounded-lg border border-loss/30 bg-loss-muted px-4 py-3 text-sm text-loss">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Your last payment failed. Update your payment method to keep your {planDef.name}{" "}
            access.
          </span>
        </div>
      )}
      {cancelAtPeriodEnd && currentPeriodEnd && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            Your subscription is set to cancel on{" "}
            <strong>{formatDate(currentPeriodEnd)}</strong> — you&apos;ll keep {planDef.name}{" "}
            access until then.
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Current Plan</CardTitle>
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-2xl font-bold tracking-tight">{planDef.name}</p>
            {plan === "FREE" ? (
              <p className="text-sm text-muted-foreground">
                {monthlyTradeCount}/{FREE_TRADE_LIMIT} trades used this month
              </p>
            ) : (
              <p className="font-numeric text-sm text-muted-foreground">
                {formatCurrency(amount)} / {billingInterval === "MONTHLY" ? "month" : "year"}
              </p>
            )}
          </div>

          {plan !== "FREE" && (
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Billing frequency</p>
                <p className="text-sm font-medium">
                  {billingInterval === "MONTHLY" ? "Monthly" : "Yearly"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {cancelAtPeriodEnd ? "Access ends" : "Next billing date"}
                </p>
                <p className="text-sm font-medium">
                  {currentPeriodEnd ? formatDate(currentPeriodEnd) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-numeric text-sm font-medium">{formatCurrency(amount)}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {plan === "FREE" ? (
              <Button
                render={<Link href="/pricing">Upgrade to Pro</Link>}
                nativeButton={false}
                size="sm"
              />
            ) : (
              <ManageBillingButton />
            )}
            <Button
              render={<Link href="/pricing">View all plans</Link>}
              nativeButton={false}
              variant="ghost"
              size="sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
