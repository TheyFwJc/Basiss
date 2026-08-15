"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";

export function PositionSizeCalculator({
  accounts,
  defaultRiskPct,
}: {
  accounts: { id: string; name: string; startingBalance: string; currency: string }[];
  defaultRiskPct: number | null;
}) {
  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [riskPct, setRiskPct] = useState(
    defaultRiskPct != null ? String(defaultRiskPct) : "1"
  );
  const [entryPrice, setEntryPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");

  const account = accounts.find((a) => a.id === accountId);

  const result = useMemo(() => {
    const balance = account ? Number(account.startingBalance) : NaN;
    const risk = Number(riskPct);
    const entry = Number(entryPrice);
    const stop = Number(stopPrice);
    const perUnitRisk = Math.abs(entry - stop);

    if (!account || !isFinite(balance) || !isFinite(risk) || risk <= 0) return null;
    if (!isFinite(entry) || !isFinite(stop) || perUnitRisk <= 0) return null;

    const riskAmount = balance * (risk / 100);
    const shares = Math.floor(riskAmount / perUnitRisk);
    const positionValue = shares * entry;

    return { riskAmount, shares, positionValue };
  }, [account, riskPct, entryPrice, stopPrice]);

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a trading account first to size a position against its balance.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label>Account</Label>
          <Select value={accountId} items={accountItems} onValueChange={(v) => setAccountId(v ?? "")}>
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
          <Label htmlFor="riskPct">Risk (%)</Label>
          <Input
            id="riskPct"
            type="number"
            step="any"
            min="0"
            max="100"
            value={riskPct}
            onChange={(e) => setRiskPct(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="entryPrice">Entry price</Label>
          <Input
            id="entryPrice"
            type="number"
            step="any"
            min="0"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stopPrice">Stop price</Label>
          <Input
            id="stopPrice"
            type="number"
            step="any"
            min="0"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-lg border border-border p-4">
        <div>
          <p className="text-xs text-muted-foreground">Dollar risk</p>
          <p className="mt-1 font-numeric text-lg font-semibold tabular-nums">
            {result ? formatCurrency(result.riskAmount, account?.currency) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Position size</p>
          <p className="mt-1 font-numeric text-lg font-semibold tabular-nums">
            {result ? result.shares.toLocaleString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Position value</p>
          <p className="mt-1 font-numeric text-lg font-semibold tabular-nums">
            {result ? formatCurrency(result.positionValue, account?.currency) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
