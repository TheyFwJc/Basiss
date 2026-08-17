"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ImagePlus,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { POPULAR_SYMBOLS } from "@/lib/symbols";
import { lookupFuturesPointValue } from "@/lib/futures-contracts";
import type { TradeInput } from "@/lib/validations/trade";
import { createTradeAction, updateTradeAction } from "./actions";
import { uploadTradeScreenshotAction } from "./[id]/screenshot-actions";
import { ScreenshotGallery, type TradeScreenshot } from "./[id]/screenshot-gallery";

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

/** A single fill's editable fields. Which side it counts as (BUY/SELL) is
 * implied entirely by whether it's an entry or exit fill plus the trade's
 * direction — never stored on the row itself, so flipping Long/Short never
 * needs to touch already-entered data. */
type FillRow = {
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

function emptyFill(): FillRow {
  return {
    quantity: "",
    price: "",
    executedAt: nowLocalDateTime(),
    fees: "0",
    commission: "0",
  };
}

function entrySideFor(direction: "LONG" | "SHORT"): "BUY" | "SELL" {
  return direction === "LONG" ? "BUY" : "SELL";
}

export type TradeFormDefaults = {
  id: string;
  tradingAccountId: string;
  symbol: string;
  assetClass: string;
  direction: "LONG" | "SHORT";
  contractMultiplier: string;
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

function splitDefaultFills(defaults: TradeFormDefaults | undefined) {
  if (!defaults) {
    return { entryFills: [emptyFill()], exitFills: [emptyFill()] };
  }
  const entrySide = entrySideFor(defaults.direction);
  const toFill = (e: TradeFormDefaults["executions"][number]): FillRow => ({
    quantity: e.quantity,
    price: e.price,
    executedAt: e.executedAt.slice(0, 16),
    fees: e.fees,
    commission: e.commission,
  });
  const entryFills = defaults.executions.filter((e) => e.side === entrySide).map(toFill);
  const exitFills = defaults.executions.filter((e) => e.side !== entrySide).map(toFill);
  return {
    entryFills: entryFills.length > 0 ? entryFills : [emptyFill()],
    exitFills,
  };
}

function FillRows({
  rows,
  label,
  accentClass,
  onAdd,
  onUpdate,
  onRemove,
  minRows,
}: {
  rows: FillRow[];
  label: string;
  accentClass: string;
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<FillRow>) => void;
  onRemove: (index: number) => void;
  minRows: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-medium", accentClass)}>{label}</span>
        <Button type="button" variant="outline" size="xs" onClick={onAdd}>
          <Plus className="size-3" />
          Add fill
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          No fills yet — leave empty if the position is still open.
        </p>
      )}
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-2 items-end gap-2 rounded-md border border-border p-2 sm:grid-cols-5"
        >
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Quantity</Label>
            <Input
              type="number"
              step="any"
              min="0"
              value={row.quantity}
              onChange={(e) => onUpdate(index, { quantity: e.target.value })}
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
              onChange={(e) => onUpdate(index, { price: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Time</Label>
            <Input
              type="datetime-local"
              value={row.executedAt}
              onChange={(e) => onUpdate(index, { executedAt: e.target.value })}
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
              onChange={(e) => onUpdate(index, { fees: e.target.value })}
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
                onChange={(e) => onUpdate(index, { commission: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              disabled={rows.length <= minRows}
              onClick={() => onRemove(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TradeForm({
  accounts,
  strategies,
  playbooks,
  mistakes,
  checklists,
  recentSymbols = [],
  defaults,
  canUploadScreenshots,
  existingScreenshots = [],
}: {
  accounts: { id: string; name: string }[];
  strategies: { id: string; name: string }[];
  playbooks: { id: string; name: string }[];
  mistakes: { id: string; name: string }[];
  checklists: ChecklistOption[];
  recentSymbols?: string[];
  defaults?: TradeFormDefaults;
  canUploadScreenshots: boolean;
  existingScreenshots?: TradeScreenshot[];
}) {
  const symbolSuggestions = [
    ...recentSymbols,
    ...POPULAR_SYMBOLS.filter((s) => !recentSymbols.includes(s)),
  ];
  const router = useRouter();
  const isEdit = !!defaults;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Collapsed by default for a new trade so logging one stays quick; expanded
  // when editing so nothing already filled in looks like it disappeared.
  const [showOptional, setShowOptional] = useState(isEdit);

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
  const [contractMultiplier, setContractMultiplier] = useState(
    defaults?.contractMultiplier ?? "1"
  );
  // Once the user (or a loaded trade) has an explicit multiplier, stop
  // overwriting it with the symbol-based auto-suggestion.
  const [multiplierTouched, setMultiplierTouched] = useState(isEdit);

  function handleSymbolChange(value: string) {
    const upper = value.toUpperCase();
    setSymbol(upper);
    if (assetClass === "FUTURES" && !multiplierTouched) {
      const suggestion = lookupFuturesPointValue(upper);
      if (suggestion != null) setContractMultiplier(String(suggestion));
    }
  }

  function handleAssetClassChange(value: string) {
    setAssetClass(value);
    if (value === "FUTURES" && !multiplierTouched) {
      const suggestion = lookupFuturesPointValue(symbol);
      if (suggestion != null) setContractMultiplier(String(suggestion));
    }
  }

  const initialFills = splitDefaultFills(defaults);
  const [entryFills, setEntryFills] = useState<FillRow[]>(initialFills.entryFills);
  const [exitFills, setExitFills] = useState<FillRow[]>(initialFills.exitFills);

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

  // Screenshots picked before the trade exists yet (create mode only) — held
  // as plain Files and uploaded once createTradeAction returns a trade id.
  const [stagedScreenshots, setStagedScreenshots] = useState<
    { file: File; previewUrl: string }[]
  >([]);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  function handleStageScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScreenshotError(null);
    if (!file.type.startsWith("image/")) {
      setScreenshotError("Only image files can be attached.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setScreenshotError("Images must be under 8MB.");
      return;
    }
    setStagedScreenshots((rows) => [...rows, { file, previewUrl: URL.createObjectURL(file) }]);
  }

  function removeStagedScreenshot(index: number) {
    setStagedScreenshots((rows) => {
      URL.revokeObjectURL(rows[index].previewUrl);
      return rows.filter((_, i) => i !== index);
    });
  }

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

  function updateEntry(index: number, patch: Partial<FillRow>) {
    setEntryFills((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function updateExit(index: number, patch: Partial<FillRow>) {
    setExitFills((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const entrySide = entrySideFor(direction);
  const exitSide: "BUY" | "SELL" = entrySide === "BUY" ? "SELL" : "BUY";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const executions = [
      ...entryFills.map((row) => ({
        side: entrySide,
        quantity: row.quantity as unknown as number,
        price: row.price as unknown as number,
        executedAt: row.executedAt,
        fees: (row.fees || "0") as unknown as number,
        commission: (row.commission || "0") as unknown as number,
      })),
      ...exitFills.map((row) => ({
        side: exitSide,
        quantity: row.quantity as unknown as number,
        price: row.price as unknown as number,
        executedAt: row.executedAt,
        fees: (row.fees || "0") as unknown as number,
        commission: (row.commission || "0") as unknown as number,
      })),
    ];

    const input: TradeInput = {
      tradingAccountId,
      symbol,
      assetClass: assetClass as TradeInput["assetClass"],
      direction,
      contractMultiplier: (assetClass === "FUTURES"
        ? contractMultiplier || "1"
        : "1") as unknown as number,
      executions,
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

      if (stagedScreenshots.length > 0) {
        let failures = 0;
        for (const { file } of stagedScreenshots) {
          const formData = new FormData();
          formData.set("file", file);
          const uploadResult = await uploadTradeScreenshotAction(result.id, formData);
          if ("error" in uploadResult) failures++;
        }
        if (failures > 0) {
          toast.error(
            `Trade saved, but ${failures} screenshot${failures > 1 ? "s" : ""} failed to upload.`
          );
        }
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
                list="symbol-suggestions"
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                placeholder="AAPL"
                autoComplete="off"
                required
              />
              <datalist id="symbol-suggestions">
                {symbolSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Asset class</Label>
              <Select
                value={assetClass}
                items={ASSET_CLASS_ITEMS}
                onValueChange={(v) => handleAssetClassChange(v ?? "EQUITY")}
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("LONG")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
                    direction === "LONG"
                      ? "border-profit/40 bg-profit-muted text-profit shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <TrendingUp className="size-4" />
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("SHORT")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
                    direction === "SHORT"
                      ? "border-loss/40 bg-loss-muted text-loss shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <TrendingDown className="size-4" />
                  Short
                </button>
              </div>
            </div>
          </div>

          {assetClass === "FUTURES" && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="contractMultiplier">Contract multiplier</Label>
                <Input
                  id="contractMultiplier"
                  type="number"
                  step="any"
                  min="0"
                  value={contractMultiplier}
                  onChange={(e) => {
                    setMultiplierTouched(true);
                    setContractMultiplier(e.target.value);
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Dollars of P&amp;L per 1.00 price move, per contract — e.g. Micro
                  Nasdaq (MNQ) is 2. Quantity below should be contracts, not points.
                  Auto-filled for common contracts; override if different.
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            A new trade starts with one entry and one exit fill, since most
            trades you log are already closed — delete the exit fill if
            you&apos;re still in the position. Add more fills for partial
            entries/exits.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FillRows
              rows={entryFills}
              label={`Entries (${entrySide === "BUY" ? "Buy" : "Sell"})`}
              accentClass="text-profit"
              onAdd={() => setEntryFills((rows) => [...rows, emptyFill()])}
              onUpdate={updateEntry}
              onRemove={(i) => setEntryFills((rows) => rows.filter((_, idx) => idx !== i))}
              minRows={1}
            />
            <FillRows
              rows={exitFills}
              label={`Exits (${exitSide === "BUY" ? "Buy" : "Sell"})`}
              accentClass="text-loss"
              onAdd={() => setExitFills((rows) => [...rows, emptyFill()])}
              onUpdate={updateExit}
              onRemove={(i) => setExitFills((rows) => rows.filter((_, idx) => idx !== i))}
              minRows={0}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Screenshots</CardTitle>
        </CardHeader>
        <CardContent>
          {isEdit ? (
            <ScreenshotGallery
              tradeId={defaults!.id}
              screenshots={existingScreenshots}
              canUpload={canUploadScreenshots}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-3">
                {stagedScreenshots.map((s, i) => (
                  <div
                    key={s.previewUrl}
                    className="group relative size-24 overflow-hidden rounded-md border border-border"
                  >
                    <div
                      className="size-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${s.previewUrl})` }}
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeStagedScreenshot(i)}
                      aria-label="Remove screenshot"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}

                {canUploadScreenshots ? (
                  <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted/50">
                    <ImagePlus className="size-5" />
                    <span className="text-[10px]">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleStageScreenshot}
                    />
                  </label>
                ) : (
                  <a
                    href="/pricing"
                    className="flex size-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-center text-muted-foreground transition-colors hover:bg-muted/50"
                  >
                    <ImagePlus className="size-5" />
                    <span className="text-[10px] leading-tight">Pro feature</span>
                  </a>
                )}
              </div>
              {screenshotError && <p className="text-sm text-loss">{screenshotError}</p>}
              {stagedScreenshots.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Uploaded once you save the trade below.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-6 text-left"
        >
          <div>
            <CardTitle className="text-base">Optional details</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Stop/target, strategy, session, notes, ratings, mistakes.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              showOptional && "rotate-180"
            )}
          />
        </button>
        {showOptional && (
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
        )}
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
