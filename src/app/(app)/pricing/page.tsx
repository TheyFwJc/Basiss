import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { getSubscription } from "@/lib/subscription";
import { PricingCards } from "./pricing-cards";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const params = await searchParams;
  const subscription = await getSubscription(userId);

  return (
    <div>
      <PageHeader
        title="Pricing"
        description="Simple pricing for serious traders. Upgrade or downgrade anytime."
      />

      {params.checkout === "canceled" && (
        <p className="mb-6 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Checkout was canceled — no changes were made to your account.
        </p>
      )}

      <PricingCards
        currentPlan={subscription.effectivePlan}
        currentInterval={subscription.billingInterval}
      />
    </div>
  );
}
