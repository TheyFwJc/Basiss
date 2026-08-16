"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, Trash2, Webhook, FlaskConical, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import type { AssetClass } from "@/lib/import";
import { createTradingViewWebhookAction, deleteTradingViewWebhookAction } from "./tradingview-actions";
import { TradingViewWalkthrough } from "./tradingview-walkthrough";

const ASSET_CLASS_OPTIONS: { value: AssetClass; label: string }[] = [
  { value: "EQUITY", label: "Equity" },
  { value: "OPTION", label: "Option" },
  { value: "FUTURES", label: "Futures" },
  { value: "FOREX", label: "Forex" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "OTHER", label: "Other" },
];
const ASSET_CLASS_ITEMS = Object.fromEntries(ASSET_CLASS_OPTIONS.map((o) => [o.value, o.label]));

const ALERT_TEMPLATE = `{
  "symbol": "{{ticker}}",
  "side": "{{strategy.order.action}}",
  "quantity": "{{strategy.order.contracts}}",
  "price": "{{close}}",
  "time": "{{timenow}}"
}`;

export type TradingViewWebhookDto = {
  id: string;
  label: string;
  tradingAccountName: string;
  defaultAssetClass: AssetClass;
  createdAt: string;
  lastTriggeredAt: string | null;
};

async function copyToClipboard(text: string, message: string) {
  await navigator.clipboard.writeText(text);
  toast.success(message);
}

/** Fires a sample buy+sell straight at a just-created webhook URL from the
 * browser — lets someone confirm the connection works and see a real trade
 * appear before they've touched TradingView at all. */
async function sendTestTrade(url: string): Promise<boolean> {
  const now = Date.now();
  // Sequential, not concurrent — the exit fill needs the entry's write to
  // have already landed so it merges into the same trade instead of racing
  // it and creating two.
  const entryRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: "TEST",
      side: "buy",
      quantity: "1",
      price: "100.00",
      time: String(Math.floor((now - 60_000) / 1000)),
    }),
  });
  if (!entryRes.ok) return false;
  const exitRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: "TEST",
      side: "sell",
      quantity: "1",
      price: "101.00",
      time: String(Math.floor(now / 1000)),
    }),
  });
  return exitRes.ok;
}

export function TradingViewWebhooks({
  accounts,
  webhooks,
}: {
  accounts: { id: string; name: string }[];
  webhooks: TradingViewWebhookDto[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [tradingAccountId, setTradingAccountId] = useState(accounts[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("EQUITY");
  const [testState, setTestState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  function handleSendTest() {
    if (!newUrl) return;
    setTestState("sending");
    sendTestTrade(newUrl).then((ok) => {
      setTestState(ok ? "sent" : "failed");
      if (!ok) toast.error("Couldn't reach the webhook — try again in a moment.");
    });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTradingViewWebhookAction(tradingAccountId, label, assetClass);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNewUrl(result.url);
      setLabel("");
      setTestState("idle");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTradingViewWebhookAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">1. Create a webhook below</span> — give
          it a label, account, and asset class.
        </li>
        <li>
          <span className="font-medium text-foreground">2. In TradingView</span>, add your{" "}
          <strong>Strategy</strong> to the chart (not a plain indicator) and create an alert on
          it set to trigger on <strong>Order fills</strong>.
        </li>
        <li>
          <span className="font-medium text-foreground">3. Paste the webhook URL</span> below
          into the alert&apos;s Webhook URL field, and paste this into the Message field:
        </li>
      </ol>

      <TradingViewWalkthrough />

      <div className="relative">
        <pre className="overflow-x-auto rounded-md bg-muted p-3 pr-10 text-xs">{ALERT_TEMPLATE}</pre>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="absolute top-1.5 right-1.5"
          onClick={() => copyToClipboard(ALERT_TEMPLATE, "Template copied")}
          aria-label="Copy alert message template"
        >
          <Copy className="size-3.5" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">4. Save the alert</span> — entries and
        exits log themselves here automatically as it fires.
      </p>

      {webhooks.length > 0 && (
        <div className="flex flex-col gap-2">
          {webhooks.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Webhook className="size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{w.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {w.tradingAccountName} ·{" "}
                    {ASSET_CLASS_ITEMS[w.defaultAssetClass] ?? w.defaultAssetClass} ·{" "}
                    {w.lastTriggeredAt
                      ? `Last fired ${formatDateTime(w.lastTriggeredAt)}`
                      : "Never fired yet"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-loss"
                onClick={() => handleDelete(w.id)}
                disabled={pending}
                aria-label={`Delete ${w.label}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {newUrl && (
        <div className="flex flex-col gap-2 rounded-md border border-primary/40 bg-primary/5 p-3">
          <p className="text-xs font-medium">
            Copy this URL now — it won&apos;t be shown again. Paste it into the alert&apos;s
            webhook URL field in TradingView.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 text-xs">
              {newUrl}
            </code>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(newUrl, "Webhook URL copied")}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 border-t border-primary/20 pt-2">
            {testState === "sent" ? (
              <p className="flex items-center gap-1.5 text-xs text-profit">
                <CheckCircle2 className="size-3.5" />
                Test trade logged — check{" "}
                <Link href="/trades" className="underline">
                  Trades
                </Link>
                .
              </p>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSendTest}
                  disabled={testState === "sending"}
                >
                  <FlaskConical className="size-3.5" />
                  {testState === "sending" ? "Sending…" : "Send test trade"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Fires a sample trade at this webhook right now — no TradingView needed, just
                  to confirm the connection works.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add a trading account first.</p>
      ) : (
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="tv-label">Label</Label>
            <Input
              id="tv-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. ORB Strategy"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Account</Label>
            <Select
              value={tradingAccountId}
              items={Object.fromEntries(accounts.map((a) => [a.id, a.name]))}
              onValueChange={(v) => setTradingAccountId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Asset class</Label>
            <Select
              value={assetClass}
              items={ASSET_CLASS_ITEMS}
              onValueChange={(v) => setAssetClass((v as AssetClass) ?? "EQUITY")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CLASS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-4">
            {error && <p className="mb-2 text-sm text-loss">{error}</p>}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creating…" : "Create webhook"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
