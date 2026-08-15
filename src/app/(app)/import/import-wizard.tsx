"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  applyMapping,
  markDuplicates,
  groupExecutionsIntoTrades,
  guessColumnMapping,
  type ImportedExecutionRow,
  type AssetClass,
} from "@/lib/import";
import type { ColumnMapping, ImportRowInput } from "@/lib/validations/import";
import {
  startImportAction,
  fetchExistingExecutionKeysAction,
  commitImportAction,
} from "./actions";

const ASSET_CLASS_OPTIONS: { value: AssetClass; label: string }[] = [
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

const NONE = "__none__";

const REQUIRED_FIELDS = [
  { key: "symbol", label: "Symbol" },
  { key: "side", label: "Side (buy/sell)" },
  { key: "quantity", label: "Quantity" },
  { key: "price", label: "Price" },
  { key: "executedAt", label: "Execution time" },
] as const;
const OPTIONAL_FIELDS = [
  { key: "fees", label: "Fees" },
  { key: "commission", label: "Commission" },
  { key: "assetClass", label: "Asset class" },
] as const;

type Step = "upload" | "mapping" | "preview" | "done";

function emptyMapping(): ColumnMapping {
  return {
    symbol: "",
    side: "",
    quantity: "",
    price: "",
    executedAt: "",
    fees: "",
    commission: "",
    assetClass: "",
  };
}

function serializeRow(row: ImportedExecutionRow): ImportRowInput {
  return {
    rowIndex: row.rowIndex,
    symbol: row.symbol,
    assetClass: row.assetClass,
    side: row.side,
    quantity: row.quantity.toString(),
    price: row.price.toString(),
    executedAt: row.executedAt.toISOString(),
    fees: row.fees.toString(),
    commission: row.commission.toString(),
  };
}

export function ImportWizard({
  accounts,
  knownBrokers,
}: {
  accounts: { id: string; name: string }[];
  knownBrokers: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tradingAccountId, setTradingAccountId] = useState(accounts[0]?.id ?? "");
  const [broker, setBroker] = useState("");
  const [defaultAssetClass, setDefaultAssetClass] = useState<AssetClass>("EQUITY");

  const [jobId, setJobId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [existingRows, setExistingRows] = useState<
    { symbol: string; side: "BUY" | "SELL"; quantity: string; price: string; executedAt: string }[]
  >([]);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping());
  const [excludedRowIndexes, setExcludedRowIndexes] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{ tradesCreated: number; executionsCreated: number } | null>(
    null
  );

  function updateMapping(patch: Partial<ColumnMapping>) {
    setMapping((m) => ({ ...m, ...patch }));
  }

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a CSV file to upload.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("tradingAccountId", tradingAccountId);
    formData.set("broker", broker);
    formData.set("defaultAssetClass", defaultAssetClass);

    startTransition(async () => {
      const [startResult, existing] = await Promise.all([
        startImportAction(formData),
        fetchExistingExecutionKeysAction(tradingAccountId),
      ]);
      if ("error" in startResult) {
        setError(startResult.error);
        return;
      }
      setJobId(startResult.jobId);
      setHeaders(startResult.headers);
      setRows(startResult.rows);
      setExistingRows(existing);
      setMapping(startResult.savedMapping ?? guessColumnMapping(startResult.headers));
      setExcludedRowIndexes(new Set());
      setStep("mapping");
    });
  }

  const existingKeys = useMemo(
    () =>
      existingRows.map((e) => ({
        symbol: e.symbol,
        side: e.side,
        quantity: e.quantity,
        price: e.price,
        executedAt: new Date(e.executedAt),
      })),
    [existingRows]
  );

  const mappedResults = useMemo(
    () =>
      headers.length > 0 && mapping.symbol && mapping.side && mapping.quantity && mapping.price && mapping.executedAt
        ? applyMapping(headers, rows, mapping, defaultAssetClass)
        : [],
    [headers, rows, mapping, defaultAssetClass]
  );

  const validRows = useMemo(
    () => mappedResults.filter((r): r is { ok: true; row: ImportedExecutionRow } => r.ok).map((r) => r.row),
    [mappedResults]
  );
  const rowErrors = useMemo(
    () => mappedResults.filter((r): r is { ok: false; rowIndex: number; error: string } => !r.ok),
    [mappedResults]
  );
  const duplicateRowIndexes = useMemo(
    () => markDuplicates(validRows, existingKeys),
    [validRows, existingKeys]
  );

  const includedRows = useMemo(
    () => validRows.filter((r) => !excludedRowIndexes.has(r.rowIndex)),
    [validRows, excludedRowIndexes]
  );
  const groups = useMemo(() => {
    if (includedRows.length === 0) return [];
    try {
      return groupExecutionsIntoTrades(includedRows);
    } catch {
      return [];
    }
  }, [includedRows]);

  const mappingComplete = REQUIRED_FIELDS.every((f) => mapping[f.key]);

  function goToPreview() {
    // Default duplicates to excluded — never silently re-import a fill already on file.
    setExcludedRowIndexes(new Set(duplicateRowIndexes));
    setStep("preview");
  }

  function toggleExcluded(rowIndex: number, included: boolean) {
    setExcludedRowIndexes((prev) => {
      const next = new Set(prev);
      if (included) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }

  function handleCommit() {
    if (!jobId) return;
    setError(null);
    startTransition(async () => {
      const commitResult = await commitImportAction({
        jobId,
        tradingAccountId,
        broker,
        mapping,
        rows: includedRows.map(serializeRow),
        skippedDuplicates: [...duplicateRowIndexes].filter((i) => excludedRowIndexes.has(i)).length,
        rowErrors: rowErrors.length,
      });
      if ("error" in commitResult) {
        setError(commitResult.error);
        return;
      }
      setResult(commitResult);
      setStep("done");
      router.refresh();
    });
  }

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Upload a broker CSV export</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a trading account first — imported trades need somewhere to go.
            </p>
          ) : (
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>Import into account</Label>
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
                  <Label htmlFor="broker">Broker</Label>
                  <Input
                    id="broker"
                    list="known-brokers"
                    value={broker}
                    onChange={(e) => setBroker(e.target.value)}
                    placeholder="e.g. Interactive Brokers"
                    required
                  />
                  <datalist id="known-brokers">
                    {knownBrokers.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Default asset class</Label>
                  <Select
                    value={defaultAssetClass}
                    items={ASSET_CLASS_ITEMS}
                    onValueChange={(v) => setDefaultAssetClass((v as AssetClass) ?? "EQUITY")}
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
                  <p className="text-xs text-muted-foreground">
                    Used unless a column is mapped for it.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="file">CSV file</Label>
                <Input id="file" ref={fileInputRef} type="file" accept=".csv,text/csv" required />
              </div>

              {error && <p className="text-sm text-loss">{error}</p>}

              <div>
                <Button type="submit" disabled={pending}>
                  <Upload className="size-4" />
                  {pending ? "Uploading…" : "Continue"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === "mapping") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Map columns</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((field) => {
              const isOptional = OPTIONAL_FIELDS.some((f) => f.key === field.key);
              const rawValue = mapping[field.key];
              const value = isOptional ? rawValue || NONE : rawValue;
              const items = {
                ...(isOptional ? { [NONE]: "— None —" } : {}),
                ...Object.fromEntries(headers.map((h) => [h, h])),
              };
              return (
                <div key={field.key} className="flex flex-col gap-2">
                  <Label>
                    {field.label} {!isOptional && <span className="text-loss">*</span>}
                  </Label>
                  <Select
                    value={value}
                    items={items}
                    onValueChange={(v) =>
                      updateMapping({
                        [field.key]: v === NONE ? "" : (v ?? ""),
                      } as Partial<ColumnMapping>)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column…" />
                    </SelectTrigger>
                    <SelectContent>
                      {isOptional && <SelectItem value={NONE}>— None —</SelectItem>}
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Preview (first {Math.min(5, rows.length)} of {rows.length} rows)
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 5).map((r, i) => (
                  <TableRow key={i}>
                    {r.map((cell, j) => (
                      <TableCell key={j}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {mappingComplete && (
            <p className="text-sm text-muted-foreground">
              {validRows.length} of {rows.length} rows map cleanly
              {rowErrors.length > 0 && `, ${rowErrors.length} have errors`}
              {duplicateRowIndexes.size > 0 && `, ${duplicateRowIndexes.size} look like duplicates`}.
            </p>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep("upload")}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button type="button" disabled={!mappingComplete || validRows.length === 0} onClick={goToPreview}>
              Review {validRows.length} row{validRows.length === 1 ? "" : "s"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    const closed = groups.filter((g) => g.pnl.status === "CLOSED").length;
    const open = groups.length - closed;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Review before importing</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Trades to create</p>
              <p className="mt-1 text-lg font-semibold">
                {groups.length}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({closed} closed, {open} open)
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Executions</p>
              <p className="mt-1 text-lg font-semibold">{includedRows.length}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Duplicates found</p>
              <p className="mt-1 text-lg font-semibold">{duplicateRowIndexes.size}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Row errors</p>
              <p className="mt-1 text-lg font-semibold">{rowErrors.length}</p>
            </div>
          </div>

          {duplicateRowIndexes.size > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <AlertTriangle className="size-4 text-loss" />
                Possible duplicates (skipped by default)
              </p>
              <div className="flex flex-col gap-1">
                {validRows
                  .filter((r) => duplicateRowIndexes.has(r.rowIndex))
                  .map((r) => (
                    <label
                      key={r.rowIndex}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={!excludedRowIndexes.has(r.rowIndex)}
                        onCheckedChange={(checked) =>
                          toggleExcluded(r.rowIndex, checked === true)
                        }
                      />
                      Row {r.rowIndex}: {r.symbol} {r.side} {r.quantity.toString()} @{" "}
                      {formatCurrency(r.price.toNumber())} — {formatDateTime(r.executedAt)}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {excludedRowIndexes.has(r.rowIndex) ? "Skip" : "Import anyway"}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {rowErrors.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Rows that couldn&apos;t be imported</p>
              <div className="flex flex-col gap-1">
                {rowErrors.map((e) => (
                  <p key={e.rowIndex} className="text-xs text-muted-foreground">
                    Row {e.rowIndex}: {e.error}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">Trades</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Net P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g, i) => (
                  <TableRow key={i}>
                    <TableCell>{g.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={g.direction === "LONG" ? "default" : "secondary"}>
                        {g.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>{g.pnl.quantity.toString()}</TableCell>
                    <TableCell>{formatDateTime(g.entryAt)}</TableCell>
                    <TableCell>{g.exitAt ? formatDateTime(g.exitAt) : "Open"}</TableCell>
                    <TableCell
                      className={
                        g.pnl.netPnl == null
                          ? "text-muted-foreground"
                          : g.pnl.netPnl.gte(0)
                            ? "text-profit"
                            : "text-loss"
                      }
                    >
                      {g.pnl.netPnl == null ? "—" : formatCurrency(g.pnl.netPnl.toString())}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {error && <p className="text-sm text-loss">{error}</p>}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep("mapping")}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button type="button" disabled={pending || groups.length === 0} onClick={handleCommit}>
              {pending ? "Importing…" : `Import ${groups.length} trade${groups.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // step === "done"
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="size-5 text-profit" />
          Import complete
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Created {result?.tradesCreated ?? 0} trade{result?.tradesCreated === 1 ? "" : "s"} from{" "}
          {result?.executionsCreated ?? 0} execution{result?.executionsCreated === 1 ? "" : "s"}.
        </p>
        <div className="flex gap-2">
          <Button render={<Link href="/trades">View trades</Link>} nativeButton={false} />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStep("upload");
              setJobId(null);
              setHeaders([]);
              setRows([]);
              setMapping(emptyMapping());
              setExcludedRowIndexes(new Set());
              setResult(null);
            }}
          >
            Import another file
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
