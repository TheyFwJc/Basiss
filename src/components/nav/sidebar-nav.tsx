"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Zap, Flag, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function SidebarNav({
  isPaidPlan,
  isAdmin,
}: {
  isPaidPlan: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  const billingItem = isPaidPlan
    ? { label: "Billing", href: "/billing", icon: CreditCard }
    : { label: "Upgrade", href: "/pricing", icon: Zap };

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
      <Link
        href="/trades/new"
        className="mb-2 flex items-center justify-center gap-1.5 rounded-md bg-brand-gradient px-3 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        Add trade
      </Link>

      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={`nav-${item.href.slice(1)}`}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-brand-gradient"
                : "text-sidebar-foreground/70 hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0 transition-transform duration-200",
                isActive ? "text-primary" : "group-hover:scale-110"
              )}
              strokeWidth={2}
            />
            {item.label}
          </Link>
        );
      })}

      {isAdmin && (
        <div className="mt-1 border-t border-sidebar-border pt-1">
          {(() => {
            const isActive = pathname === "/admin" || pathname.startsWith("/admin/");
            return (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Flag className="size-4 shrink-0" strokeWidth={2} />
                Admin
              </Link>
            );
          })()}
        </div>
      )}

      <div className="mt-1 border-t border-sidebar-border pt-1">
        {(() => {
          const isActive =
            pathname === billingItem.href || pathname.startsWith(`${billingItem.href}/`);
          const Icon = billingItem.icon;
          return (
            <Link
              href={billingItem.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                !isPaidPlan
                  ? "bg-brand-gradient text-white shadow-sm hover:opacity-90"
                  : isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={2} />
              {billingItem.label}
            </Link>
          );
        })()}
      </div>
    </nav>
  );
}
