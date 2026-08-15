import { parse } from "csv-parse/sync";

/**
 * Node-only CSV parsing (csv-parse), kept separate from import.ts so the
 * rest of the import engine stays free of server-only dependencies and can
 * run in the browser too. Only call this from Server Actions/route handlers.
 */

export type ParsedCsv = { headers: string[]; rows: string[][] };

/** Parses raw CSV text into a header row plus data rows. Never throws on malformed rows — csv-parse fills short rows with empty strings. */
export function parseCsv(text: string): ParsedCsv {
  const records: string[][] = parse(text, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }).map((row: string[]) => row.map((cell) => cell.trim()));

  if (records.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = records;
  return { headers, rows };
}
