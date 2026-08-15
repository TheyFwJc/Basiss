import { cn } from "@/lib/utils";

/**
 * The gradient-glow "B" mark used in the sidebar and marketing header.
 * A plain gradient div (not an SVG icon) so it doubles as the brand's visual
 * anchor without depending on any external asset.
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
          "relative flex items-center justify-center rounded-lg bg-brand-gradient font-heading font-bold text-white",
          className
        )}
      >
        B
      </span>
    </span>
  );
}
