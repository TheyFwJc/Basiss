import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency } from "@/lib/format";
import { PLANS, type Plan } from "@/lib/plans";

type PaidPlan = Extract<Plan, "PRO" | "PRO_PLUS">;

/** Full-section locked-feature prompt — used to gate an entire page/panel
 * (Analytics, Insights, Screenshots) behind a plan. */
export function UpgradePrompt({
  feature,
  requiredPlan,
}: {
  feature: string;
  requiredPlan: PaidPlan;
}) {
  const planDef = PLANS[requiredPlan];
  return (
    <EmptyState
      icon={Lock}
      title={`${feature} is a ${planDef.name} feature`}
      description={`Upgrade to ${planDef.name} for ${formatCurrency(planDef.monthlyPrice)}/month to unlock ${feature.toLowerCase()}.`}
      actions={
        <Button
          render={<Link href="/pricing">Upgrade to {planDef.name}</Link>}
          nativeButton={false}
          size="sm"
        />
      }
    />
  );
}

/** Compact locked stand-in for a single KPI tile — same footprint as
 * KpiCard, so it drops into an existing KPI grid without breaking layout. */
export function LockedKpiCard({ label, requiredPlan }: { label: string; requiredPlan: PaidPlan }) {
  const planDef = PLANS[requiredPlan];
  return (
    <Link
      href="/pricing"
      className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-dashed border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
        <Lock className="size-3.5" />
        <span className="text-xs font-medium">{planDef.name}</span>
      </div>
    </Link>
  );
}
