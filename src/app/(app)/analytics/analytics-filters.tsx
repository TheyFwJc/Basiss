"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAY_LABELS, SESSION_LABELS } from "@/lib/analytics";

const DIRECTION_OPTIONS = [
  { value: "all", label: "All directions" },
  { value: "LONG", label: "Long" },
  { value: "SHORT", label: "Short" },
];

const DAY_OPTIONS = [
  { value: "all", label: "All days" },
  ...DAY_LABELS.map((label, i) => ({ value: String(i), label })),
];

const SESSION_OPTIONS = [
  { value: "all", label: "All sessions" },
  ...Object.entries(SESSION_LABELS).map(([value, label]) => ({ value, label })),
];

export function AnalyticsFilters({
  strategies,
  mistakes,
}: {
  strategies: { id: string; name: string }[];
  mistakes: { id: string; name: string }[];
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
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
        value={searchParams.get("strategyId") ?? "all"}
        items={{
          all: "All strategies",
          ...Object.fromEntries(strategies.map((s) => [s.id, s.name])),
        }}
        onValueChange={(v) => updateParam("strategyId", v ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All strategies" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All strategies</SelectItem>
          {strategies.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("session") ?? "all"}
        items={Object.fromEntries(SESSION_OPTIONS.map((o) => [o.value, o.label]))}
        onValueChange={(v) => updateParam("session", v ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SESSION_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("dayOfWeek") ?? "all"}
        items={Object.fromEntries(DAY_OPTIONS.map((o) => [o.value, o.label]))}
        onValueChange={(v) => updateParam("dayOfWeek", v ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DAY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("mistakeId") ?? "all"}
        items={{
          all: "All mistakes",
          ...Object.fromEntries(mistakes.map((m) => [m.id, m.name])),
        }}
        onValueChange={(v) => updateParam("mistakeId", v ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All mistakes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All mistakes</SelectItem>
          {mistakes.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
