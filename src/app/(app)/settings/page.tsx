import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSubscription } from "@/lib/subscription";
import { PLANS } from "@/lib/plans";
import { ProfileForm } from "./profile-form";
import { PreferencesForm } from "./preferences-form";
import { TradingViewWebhooks } from "./tradingview-webhooks";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, subscription, accounts, webhooks] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { settings: true },
    }),
    getSubscription(userId),
    db.tradingAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    db.tradingViewWebhook.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { tradingAccount: { select: { name: true } } },
    }),
  ]);

  const planDef = PLANS[subscription.effectivePlan];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your profile and preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your name is shown throughout the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>
            Used to display dates and currency amounts consistently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm
            timezone={user.settings?.timezone ?? "America/New_York"}
            baseCurrency={user.settings?.baseCurrency ?? "USD"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Plan & Billing</CardTitle>
          <Badge variant={subscription.effectivePlan === "FREE" ? "secondary" : "default"}>
            {planDef.name}
          </Badge>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {subscription.effectivePlan === "FREE"
              ? "Free plan — limited trades per month."
              : `${planDef.name} — ${subscription.billingInterval === "MONTHLY" ? "billed monthly" : "billed yearly"}.`}
          </p>
          <Button
            render={<Link href="/billing">Manage Billing</Link>}
            nativeButton={false}
            variant="outline"
            size="sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">TradingView auto-import</CardTitle>
          <CardDescription>
            Log entries/exits from a TradingView Strategy alert automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TradingViewWebhooks
            accounts={accounts}
            webhooks={webhooks.map((w) => ({
              id: w.id,
              label: w.label,
              tradingAccountName: w.tradingAccount.name,
              defaultAssetClass: w.defaultAssetClass,
              createdAt: w.createdAt.toISOString(),
              lastTriggeredAt: w.lastTriggeredAt?.toISOString() ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
