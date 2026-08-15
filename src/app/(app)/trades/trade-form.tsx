"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { TradeInput } from "@/lib/validations/trade";
import { createTradeAction, updateTradeAction } from "./actions";

const ASSET_CLASS_OPTIONS = [
  { value: "EQUITY", label: "Equity" },
  { value: "OPTION", label: "Option" },
  { value: "FUTURES", label: "Futures" },
  { value: "FOREX", label: "Forex" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "OTHER", label: "Other" },
];

const SESSION_OPTIONS = [
  { value: "PRE_MARKET", label: "Pre-market" },
  { value: "OPEN", label: "Open" },
  { value: "MIDDAY", label: "Midday" },
  { value: "POWER_HOUR", label: "Power hour" },
  { value: "AFTER_HOURS", label: "After-hours" },
  { value: "OVERNIGHT", label: "Overnight" },
];

const RATING_OPTIONS = ["1", "2", "3", "4", "5"];

const ASSET_CLASS_ITEMS = Object.fromEntries(
  ASSET_CLASS_OPTIONS.map((o) => [o.value, o.label])
);
const SESSION_ITEMS = Object.fromEntries(
  SESSION_OPTIONS.map((o) => [o.value, o.label])
);
const DIRECTION_ITEMS = { LONG: "Long", SHORT: "Short" };
const SIDE_ITEMS = { BUY: "Buy", SELL: "Sell" };

type ExecutionRow = {
  side: "BUY" | "SELL";
  quantity: string;
  price: string;
  executedAt: string;
  fees: string;
  commission: string;
};

function nowLocalDateTime() {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function emptyExecution(side: "BUY" | "SELL"): ExecutionRow {
  return {
    side,
    quantity: "",
    price: "",
    executedAt: nowLocalDateTime(),
    fees: "0",
    commission: "0",
  };
}

export type TradeFormDefaults = {
  id: string;
  tradingAccountId: string;
  symbol: string;
  assetClass: string;
  direction: "LONG" | "SHORT";
  stopLoss: string | null;
  takeProfit: string | null;
  strategyId: string | null;
  playbookId: string | null;
  session: string | null;
  marketCondition: string | null;
  notesBefore: string | null;
  notesDuring: string | null;
  notesAfter: string | null;
  emotionBefore: string | null;
  emotionDuring: string | null;
  emotionAfter: string | null;
  confidence: number | null;
  executionRating: number | null;
  ruleAdherence: number | null;
  mistakeIds: string[];
  checklistItemIds: string[];
  executions: {
    side: "BUY" | "SELL";
    quantity: string;
    price: string;
    executedAt: string;
    fees: string;
    commission: string;
  }[];
};

export type ChecklistOption = {
  id: string;
  name: string;
  playbookId: string | null;
  items: { id: string; label: string }[];
};

export function TradeForm({
  accounts,
  strategies,
  playbooks,
  mistakes,
  checklists,
  defaults,
}: {
  accounts: { id: string; name: string }[];
  strategies: { id: string; name: string }[];
  playbooks: { id: string; name: string }[];
  mistakes: { id: string; name: string }[];
  checklists: ChecklistOption[];
  defaults?: TradeFormDefaults;
}) {
  const router = useRouter();
  const isEdit = !!defaults;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const strategyItems = Object.fromEntries(
    strategies.map((s) => [s.id, s.name])
  );
  const playbookItems = Object.fromEntries(
    playbooks.map((p) => [p.id, p.name])
  );

  const [tradingAccountId, setTradingAccountId] = useState(
    defaults?.tradingAccountId ?? accounts[0]?.id ?? ""
  );
  const [symbol, setSymbol] = useState(defaults?.symbol ?? "");
  const [assetClass, setAssetClass] = useState(defaults?.assetClass ?? "EQUITY");
  const [direction, setDirection] = useState<"LONG" | "SHORT">(
    defaults?.direction ?? "LONG"
  );
  const [executions, setExecutions] = useState<ExecutionRow[]>(
    defaults?.executions.map((e) => ({
      side: e.side,
      quantity: e.quantity,
      price: e.price,
      executedAt: e.executedAt.slice(0, 16),
      fees: e.fees,
      commission: e.commission,
    })) ?? [emptyExecution("BUY")]
  );

  const [stopLoss, setStopLoss] = useState(defaults?.stopLoss ?? "");
  const [takeProfit, setTakeProfit] = useState(defaults?.takeProfit ?? "");
  const [strategyId, setStrategyId] = useState(defaults?.strategyId ?? "");
  const [playbookId, setPlaybookId] = useState(defaults?.playbookId ?? "");
  const [session, setSession] = useState(defaults?.session ?? "");
  const [marketCondition, setMarketCondition] = useState(
    defaults?.marketCondition ?? ""
  );
  const [notesBefore, setNotesBefore] = useState(defaults?.notesBefore ?? "");
  const [notesDuring, setNotesDuring] = useState(defaults?.notesDuring ?? "");
  const [notesAfter, setNotesAfter] = useState(defaults?.notesAfter ?? "");
  const [emotionBefore, setEmotionBefore] = useState(defaults?.emotionBefore ?? "");
  const [emotionDuring, setEmotionDuring] = useState(defaults?.emotionDuring ?? "");
  const [emotionAfter, setEmotionAfter] = useState(defaults?.emotionAfter ?? "");
  const [confidence, setConfidence] = useState(
    defaults?.confidence ? String(defaults.confidence) : ""
  );
  const [executionRating, setExecutionRating] = useState(
    defaults?.executionRating ? String(defaults.executionRating) : ""
  );
  const [ruleAdherence, setRuleAdherence] = useState(
    defaults?.ruleAdherence ? String(defaults.ruleAdherence) : ""
  );
  const [mistakeIds, setMistakeIds] = useState<string[]>(
    defaults?.mistakeIds ?? []
  );
  const [checklistItemIds, setChecklistItemIds] = useState<string[]>(
    defaults?.checklistItemIds ?? []
  );

  function toggleMistake(id: string, checked: boolean) {
    setMistakeIds((ids) =>
      checked ? [...ids, id] : ids.filter((existing) => existing !== id)
    );
  }

  function toggleChecklistItem(id: string, checked: boolean) {
    setChecklistItemIds((ids) =>
      checked ? [...ids, id] : ids.filter((existing) => existing !== id)
    );
  }

  const visibleChecklists = checklists.filter(
    (c) => c.playbookId === null || c.playbookId === playbookId
  );

  function updateExecution(index: number, patch: Partial<ExecutionRow>) {
    setExecutions((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addExecution(side: "BUY" | "SELL") {
    setExecutions((rows) => [...rows, emptyExecution(side)]);
  }

  function removeExecution(index: number) {
    setExecutions((rows) => rows.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: TradeInput = {
      tradingAccountId,
      symbol,
      assetClass: assetClass as TradeInput["assetClass"],
      direction,
      executions: executions.map((row) => ({
        side: row.side,
        quantity: row.quantity as unknown as number,
        price: row.price as unknown as number,
        executedAt: row.executedAt,
        fees: (row.fees || "0") as unknown as number,
        commission: (row.commission || "0") as unknown as number,
      })),
      stopLoss: (stopLoss || undefined) as unknown as number | undefined,
      takeProfit: (takeProfit || undefined) as unknown as number | undefined,
      strategyId,
      playbookId,
      session: session as TradeInput["session"],
      marketCondition,
      notesBefore,
      notesDuring,
      notesAfter,
      emotionBefore,
      emotionDuring,
      emotionAfter,
      confidence: (confidence || undefined) as unknown as number | undefined,
      executionRating: (executionRating || undefined) as unknown as
        | number
        | undefined,
      ruleAdherence: (ruleAdherence || undefined) as unknown as
        | number
        | undefined,
      mistakeIds,
      checklistItemIds,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateTradeAction(defaults!.id, input)
        : await createTradeAction(input);

      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/trades/${result.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label>Account</Label>
              <Select
                value={tradingAccountId}
                items={accountItems}
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
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Asset class</Label>
              <Select
                value={assetClass}
                items={ASSET_CLASS_ITEMS}
                onValueChange={(v) => setAssetClass(v ?? "EQUITY")}
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
            <div className="flex flex-col gap-2">
              <Label>Direction</Label>
              <Select
                value={direction}
                items={DIRECTION_ITEMS}
                onValueChange={(v) => setDirection(v as "LONG" | "SHORT")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LONG">Long</SelectItem>
                  <SelectItem value="SHORT">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Executions</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => addExecution("BUY")}
                >
                  <Plus className="size-3" />
                  Buy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => addExecution("SELL")}
                >
                  <Plus className="size-3" />
                  Sell
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A trade can have multiple entries and exits — add one row per
              fill. Leave only entry rows if the position is still open.
            </p>
            <div className="flex flex-col gap-2">
              {executions.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 items-end gap-2 rounded-md border border-border p-2 sm:grid-cols-6"
                >
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Side</Label>
                    <Select
                      value={row.side}
                      items={SIDE_ITEMS}
                      onValueChange={(v) =>
                        updateExecution(index, { side: v as "BUY" | "SELL" })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={row.quantity}
                      onChange={(e) =>
                        updateExecution(index, { quantity: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={row.price}
                      onChange={(e) =>
                        updateExecution(index, { price: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Time</Label>
                    <Input
                      type="datetime-local"
                      value={row.executedAt}
                      onChange={(e) =>
                        updateExecution(index, { executedAt: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Fees</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={row.fees}
                      onChange={(e) =>
                        updateExecution(index, { fees: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="flex flex-1 flex-col gap-1">
                      <Label className="text-xs">Commission</Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={row.commission}
                        onChange={(e) =>
                          updateExecution(index, { commission: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      disabled={executions.length === 1}
                      onClick={() => removeExecution(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Optional</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="stopLoss">Stop loss</Label>
              <Input
                id="stopLoss"
                type="number"
                step="any"
                min="0"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="takeProfit">Take profit</Label>
              <Input
                id="takeProfit"
                type="number"
                step="any"
                min="0"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Strategy</Label>
              <Select
                value={strategyId}
                items={strategyItems}
                onValueChange={(v) => setStrategyId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Playbook</Label>
              <Select
                value={playbookId}
                items={playbookItems}
                onValueChange={(v) => setPlaybookId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {playbooks.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Session</Label>
              <Select
                value={session}
                items={SESSION_ITEMS}
                onValueChange={(v) => setSession(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="marketCondition">Market condition</Label>
              <Input
                id="marketCondition"
                value={marketCondition}
                onChange={(e) => setMarketCondition(e.target.value)}
                placeholder="e.g. Trending, high volume"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="notesBefore">Notes — before</Label>
              <Textarea
                id="notesBefore"
                rows={3}
                value={notesBefore}
                onChange={(e) => setNotesBefore(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notesDuring">Notes — during</Label>
              <Textarea
                id="notesDuring"
                rows={3}
                value={notesDuring}
                onChange={(e) => setNotesDuring(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notesAfter">Notes — after</Label>
              <Textarea
                id="notesAfter"
                rows={3}
                value={notesAfter}
                onChange={(e) => setNotesAfter(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="emotionBefore">Emotion — before</Label>
              <Input
                id="emotionBefore"
                value={emotionBefore}
                onChange={(e) => setEmotionBefore(e.target.value)}
                placeholder="e.g. Calm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="emotionDuring">Emotion — during</Label>
              <Input
                id="emotionDuring"
                value={emotionDuring}
                onChange={(e) => setEmotionDuring(e.target.value)}
                placeholder="e.g. Focused"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="emotionAfter">Emotion — after</Label>
              <Input
                id="emotionAfter"
                value={emotionAfter}
                onChange={(e) => setEmotionAfter(e.target.value)}
                placeholder="e.g. Satisfied"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>Confidence (1-5)</Label>
              <Select value={confidence} onValueChange={(v) => setConfidence(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {RATING_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Execution quality (1-5)</Label>
              <Select
                value={executionRating}
                onValueChange={(v) => setExecutionRating(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {RATING_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Rule adherence (1-5)</Label>
              <Select
                value={ruleAdherence}
                onValueChange={(v) => setRuleAdherence(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {RATING_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {visibleChecklists.length > 0 && (
            <div className="flex flex-col gap-4">
              <Label>Checklist</Label>
              {visibleChecklists.map((checklist) => (
                <div key={checklist.id} className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {checklist.name}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {checklist.items.map((item) => (
                      <label
                        key={item.id}
                        className="group flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={checklistItemIds.includes(item.id)}
                          onCheckedChange={(checked) =>
                            toggleChecklistItem(item.id, checked === true)
                          }
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Mistakes</Label>
            {mistakes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No mistakes tracked yet — add some on the{" "}
                <a href="/mistakes" className="underline">
                  Mistakes
                </a>{" "}
                page to tag them here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {mistakes.map((mistake) => (
                  <label
                    key={mistake.id}
                    className="group flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={mistakeIds.includes(mistake.id)}
                      onCheckedChange={(checked) =>
                        toggleMistake(mistake.id, checked === true)
                      }
                    />
                    {mistake.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-loss">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Save trade"}
        </Button>
      </div>
    </form>
  );
}
