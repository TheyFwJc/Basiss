"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Trash2, Webhook } from "lucide-react";
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
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTradingViewWebhookAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Give a TradingView Strategy alert a webhook URL below and it logs entries/exits here
        automatically, as they fire. Use this alert message template:
      </p>
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{ALERT_TEMPLATE}</pre>

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
