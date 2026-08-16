import { cn } from "@/lib/utils";

/**
 * The gradient-glow breakout-arrow mark used in the sidebar and marketing
 * header. A plain inline SVG (not an image asset) so it doubles as the
 * brand's visual anchor without depending on anything external.
 */
export function BrandMark({ className, glow = true }: { className?: string; glow?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0">
      {glow && (
        <span
          aria-hidden
          className="absolute inset-0 animate-glow-pulse rounded-lg bg-brand-gradient blur-md"
        />
      )}
      <span
        className={cn(
          "relative flex items-center justify-center rounded-lg bg-brand-gradient",
          className
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]" aria-hidden>
          <path
            d="M3 17l6-6 4 4 8-8"
            stroke="white"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 7h6v6"
            stroke="white"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}
