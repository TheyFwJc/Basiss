"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BrandMark } from "@/components/brand-mark";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsBell, type NotificationItem } from "./notifications-bell";
import { AccountSwitcher } from "./account-switcher";
import { WelcomeExperience } from "@/components/welcome-experience";
import { EntryTransition } from "@/components/entry-transition";
import { PageTransition } from "./page-transition";

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
  isNewUser,
  isAdmin,
  accounts,
  scopedAccountId,
}: {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  notifications: NotificationItem[];
  isPaidPlan: boolean;
  isNewUser: boolean;
  isAdmin: boolean;
  accounts: { id: string; name: string }[];
  scopedAccountId: string | null;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [entryDone, setEntryDone] = React.useState(false);
  const pathname = usePathname();

  // Close the mobile drawer once navigation actually lands on the new page,
  // rather than the instant the link is clicked.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {!entryDone && <EntryTransition onDone={() => setEntryDone(true)} />}
      <WelcomeExperience isNewUser={isNewUser} userName={userName} ready={entryDone} />
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Brand />
        <SidebarNav isPaidPlan={isPaidPlan} isAdmin={isAdmin} />
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
          <SidebarNav isPaidPlan={isPaidPlan} isAdmin={isAdmin} />
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
          {accounts.length > 1 && (
            <AccountSwitcher accounts={accounts} selectedAccountId={scopedAccountId} />
          )}
          <div className="flex-1" />
          <NotificationsBell notifications={notifications} />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
