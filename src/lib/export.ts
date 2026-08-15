/**
 * CSV serialization for trade export. One row per trade (execution-level
 * detail is JSON-only — see the export route) so a spreadsheet stays
 * readable. Kept separate from the export route so the tricky part —
 * quoting/escaping — is unit-tested on its own.
 */

export type TradeExportRow = {
  id: string;
  account: string;
  currency: string;
  symbol: string;
  assetClass: string;
  direction: string;
  status: string;
  quantity: string;
  avgEntryPrice: string;
  avgExitPrice: string | null;
  entryAt: string;
  exitAt: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  fees: string;
  commission: string;
  grossPnl: string | null;
  netPnl: string | null;
  riskAmount: string | null;
  riskPercent: string | null;
  rMultiple: string | null;
  strategy: string | null;
  playbook: string | null;
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
  executionCount: number;
};

export const TRADE_EXPORT_COLUMNS: (keyof TradeExportRow)[] = [
  "id",
  "account",
  "currency",
  "symbol",
  "assetClass",
  "direction",
  "status",
  "quantity",
  "avgEntryPrice",
  "avgExitPrice",
  "entryAt",
  "exitAt",
  "stopLoss",
  "takeProfit",
  "fees",
  "commission",
  "grossPnl",
  "netPnl",
  "riskAmount",
  "riskPercent",
  "rMultiple",
  "strategy",
  "playbook",
  "session",
  "marketCondition",
  "notesBefore",
  "notesDuring",
  "notesAfter",
  "emotionBefore",
  "emotionDuring",
  "emotionAfter",
  "confidence",
  "executionRating",
  "ruleAdherence",
  "executionCount",
];

/** Quotes a CSV field only when it needs it, doubling any embedded quotes per RFC 4180. */
function csvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildTradesCsv(rows: TradeExportRow[]): string {
  const lines = [
    TRADE_EXPORT_COLUMNS.join(","),
    ...rows.map((row) => TRADE_EXPORT_COLUMNS.map((col) => csvValue(row[col])).join(",")),
  ];
  return lines.join("\r\n");
}
