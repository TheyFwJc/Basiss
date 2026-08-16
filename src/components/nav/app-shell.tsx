"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BrandMark } from "@/components/brand-mark";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsBell, type NotificationItem } from "./notifications-bell";

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 px-4 py-4 text-base font-semibold tracking-tight"
    >
      <BrandMark className="size-7 text-sm" />
      Basis
    </Link>
  );
}

export function AppShell({
  children,
  userName,
  userEmail,
  notifications,
  isPaidPlan,
}: {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  notifications: NotificationItem[];
  isPaidPlan: boolean;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Brand />
        <SidebarNav isPaidPlan={isPaidPlan} />
        <div className="border-t border-sidebar-border p-2">
          <UserMenu name={userName} email={userEmail} />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand />
          <SidebarNav isPaidPlan={isPaidPlan} />
          <div className="border-t border-sidebar-border p-2">
            <UserMenu name={userName} email={userEmail} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <div className="flex-1" />
          <NotificationsBell notifications={notifications} />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
