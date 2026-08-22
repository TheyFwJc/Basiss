"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { createTradeAction } from "@/app/(app)/trades/actions";
import type { TradeInput } from "@/lib/validations/trade";
import { lookupFuturesPointValue } from "@/lib/futures-contracts";

const ASSET_CLASS_OPTIONS = [
  { value: "EQUITY", label: "Equity" },
  { value: "OPTION", label: "Option" },
  { value: "FUTURES", label: "Futures" },
  { value: "FOREX", label: "Forex" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "OTHER", label: "Other" },
];
const ASSET_CLASS_ITEMS = Object.fromEntries(
  ASSET_CLASS_OPTIONS.map((o) => [o.value, o.label])
);

/** Accounts of this type default the dialog to that asset class, since the
 * account itself already tells you what's usually traded on it. */
const ASSET_CLASS_FOR_ACCOUNT_TYPE: Record<string, string> = {
  FUTURES: "FUTURES",
  FOREX: "FOREX",
  CRYPTO: "CRYPTO",
};

type Account = { id: string; name: string; accountType: string };

/**
 * The fast path for logging a trade: symbol, direction, quantity, and
 * entry/exit price — everything else (strategy, notes, ratings, etc.)
 * defaults to nothing and can be filled in later via Edit. This is what the
 * persistent "Add trade" button opens instead of navigating to the full
 * form; "Open the full form" inside it is the escape hatch for anyone who
 * wants that detail up front.
 */
export function QuickAddTradeDialog({
  accounts,
  defaultAccountId,
}: {
  accounts: Account[];
  defaultAccountId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [accountId, setAccountId] = useState(defaultAccountId ?? accounts[0]?.id ?? "");
  const [symbol, setSymbol] = useState("");
  const [assetClass, setAssetClass] = useState("EQUITY");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [quantity, setQuantity] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  );

  function handleAccountChange(id: string) {
    setAccountId(id);
    const account = accounts.find((a) => a.id === id);
    if (account) {
      setAssetClass(ASSET_CLASS_FOR_ACCOUNT_TYPE[account.accountType] ?? "EQUITY");
    }
  }

  function resetForm() {
    setSymbol("");
    setQuantity("");
    setEntryPrice("");
    setExitPrice("");
    setDirection("LONG");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const now = new Date().toISOString();
    const entrySide: "BUY" | "SELL" = direction === "LONG" ? "BUY" : "SELL";
    const exitSide: "BUY" | "SELL" = direction === "LONG" ? "SELL" : "BUY";
    const contractMultiplier =
      assetClass === "FUTURES" ? lookupFuturesPointValue(symbol) ?? 1 : 1;

    const input: TradeInput = {
      tradingAccountId: accountId,
      symbol,
      assetClass: assetClass as TradeInput["assetClass"],
      direction,
      contractMultiplier,
      executions: [
        {
          side: entrySide,
          quantity: quantity as unknown as number,
          price: entryPrice as unknown as number,
          executedAt: now,
          fees: 0,
          commission: 0,
        },
        ...(exitPrice
          ? [
              {
                side: exitSide,
                quantity: quantity as unknown as number,
                price: exitPrice as unknown as number,
                executedAt: now,
                fees: 0,
                commission: 0,
              },
            ]
          : []),
      ],
      stopLoss: undefined,
      takeProfit: undefined,
      strategyId: "",
      playbookId: "",
      session: "",
      marketCondition: "",
      notesBefore: "",
      notesDuring: "",
      notesAfter: "",
      emotionBefore: "",
      emotionDuring: "",
      emotionAfter: "",
      confidence: undefined,
      executionRating: undefined,
      ruleAdherence: undefined,
      mistakeIds: [],
      checklistItemIds: [],
    };

    startTransition(async () => {
      const result = await createTradeAction(input);

      if ("error" in result) {
        setError(result.error);
        return;
      }
      resetForm();
      setOpen(false);
      router.push(`/trades/${result.id}`);
    });
  }

  if (accounts.length === 0) {
    return (
      <Link
        href="/trades/new"
        className="mb-2 flex items-center justify-center gap-1.5 rounded-md bg-brand-gradient px-3 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        Add trade
      </Link>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : (setOpen(false), resetForm()))}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="mb-2 flex items-center justify-center gap-1.5 rounded-md bg-brand-gradient px-3 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Add trade
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Quick add a trade</DialogTitle>
            <DialogDescription>
              Just the essentials — leave exit price blank for a still-open position.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label id="quick-account-label">Account</Label>
                <Select
                  value={accountId}
                  items={Object.fromEntries(accounts.map((a) => [a.id, a.name]))}
                  onValueChange={(v) => v && handleAccountChange(v)}
                >
                  <SelectTrigger className="w-full" aria-labelledby="quick-account-label">
                    <SelectValue />
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
                <Label id="quick-asset-class-label">Asset class</Label>
                <Select
                  value={assetClass}
                  items={ASSET_CLASS_ITEMS}
                  onValueChange={(v) => v && setAssetClass(v)}
                >
                  <SelectTrigger className="w-full" aria-labelledby="quick-asset-class-label">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="quick-symbol">Symbol</Label>
                <Input
                  id="quick-symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Direction</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection("LONG")}
                    className={`flex flex-1 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${
                      direction === "LONG"
                        ? "border-profit/40 bg-profit-muted text-profit shadow-sm"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    Long
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("SHORT")}
                    className={`flex flex-1 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${
                      direction === "SHORT"
                        ? "border-loss/40 bg-loss-muted text-loss shadow-sm"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    Short
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="quick-qty">Quantity</Label>
                <Input
                  id="quick-qty"
                  type="number"
                  step="any"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="quick-entry">Entry price</Label>
                <Input
                  id="quick-entry"
                  type="number"
                  step="any"
                  min="0"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="quick-exit">Exit price</Label>
                <Input
                  id="quick-exit"
                  type="number"
                  step="any"
                  min="0"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="Still open"
                />
              </div>
            </div>

            {selectedAccount?.accountType === "FUTURES" && assetClass === "FUTURES" && (
              <p className="text-xs text-muted-foreground">
                Contract multiplier is auto-filled for common futures symbols.
              </p>
            )}

            {error && <p className="text-sm text-loss">{error}</p>}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              render={
                <Link href="/trades/new" onClick={() => setOpen(false)}>
                  Need more detail? Open full form
                  <ArrowRight className="size-3.5" />
                </Link>
              }
              nativeButton={false}
              variant="ghost"
              size="sm"
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Log trade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
