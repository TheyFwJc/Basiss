import { cn } from "@/lib/utils";

/**
 * Visually matches DropdownMenuItem, but renders a plain element instead of
 * the Base UI Menu.Item primitive. Use this (instead of DropdownMenuItem) as
 * the `render` target for another Base UI trigger (Dialog/AlertDialog) nested
 * inside a dropdown menu — wrapping one Base UI primitive's `render` around
 * another causes an SSR/CSR hydration mismatch on `data-slot` that silently
 * breaks the nested trigger's click handling.
 */
export function MenuItemTrigger({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "default" | "destructive" }) {
  return (
    <div
      role="menuitem"
      tabIndex={-1}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className
      )}
      {...props}
    />
  );
}
