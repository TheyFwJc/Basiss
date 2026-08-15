"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RESULT_OPTIONS = [
  { value: "all", label: "All results" },
  { value: "win", label: "Winners" },
  { value: "loss", label: "Losers" },
  { value: "open", label: "Open" },
];

const DIRECTION_OPTIONS = [
  { value: "all", label: "All directions" },
  { value: "LONG", label: "Long" },
  { value: "SHORT", label: "Short" },
];

export function TradeFilters({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [symbol, setSymbol] = useState(searchParams.get("symbol") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Search symbol…"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        onBlur={() => updateParam("symbol", symbol)}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateParam("symbol", symbol);
        }}
        className="sm:max-w-48"
      />
      <Select
        value={searchParams.get("accountId") ?? "all"}
        items={{
          all: "All accounts",
          ...Object.fromEntries(accounts.map((a) => [a.id, a.name])),
        }}
        onValueChange={(v) => updateParam("accountId", v ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="All accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("direction") ?? "all"}
        items={Object.fromEntries(DIRECTION_OPTIONS.map((o) => [o.value, o.label]))}
        onValueChange={(v) => updateParam("direction", v ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DIRECTION_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("result") ?? "all"}
        items={Object.fromEntries(RESULT_OPTIONS.map((o) => [o.value, o.label]))}
        onValueChange={(v) => updateParam("result", v ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RESULT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
