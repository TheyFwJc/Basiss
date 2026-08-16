/** Deterministic per-symbol color so the same ticker always gets the same
 * badge color across the app — not meaningful data, just a visual anchor
 * that makes trade lists easier to scan at a glance. */
const PALETTE = [
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
];

function colorFor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function SymbolBadge({ symbol, className = "" }: { symbol: string; className?: string }) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-tight ${colorFor(symbol)} ${className}`}
    >
      {symbol.slice(0, 3).toUpperCase()}
    </span>
  );
}
