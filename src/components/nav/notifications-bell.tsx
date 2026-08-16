"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  ShieldAlert,
  TrendingDown,
  NotebookPen,
  ClipboardList,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/(app)/notifications-actions";

export type NotificationItem = {
  id: string;
  type:
    | "DAILY_LOSS_LIMIT"
    | "WEEKLY_DRAWDOWN"
    | "MISSING_JOURNAL"
    | "REVIEW_REMINDER"
    | "RISK_LIMIT"
    | "WEEKLY_REVIEW";
  message: string;
  read: boolean;
  createdAt: string;
};

const TYPE_META = {
  DAILY_LOSS_LIMIT: { icon: ShieldAlert, href: "/risk" },
  WEEKLY_DRAWDOWN: { icon: TrendingDown, href: "/risk" },
  MISSING_JOURNAL: { icon: NotebookPen, href: "/journal" },
  REVIEW_REMINDER: { icon: ClipboardList, href: "/trades" },
  RISK_LIMIT: { icon: AlertTriangle, href: "/risk" },
  WEEKLY_REVIEW: { icon: BarChart3, href: "/analytics" },
} as const;

export function NotificationsBell({ notifications }: { notifications: NotificationItem[] }) {
  const [pending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleOpenNotification(id: string) {
    if (notifications.find((n) => n.id === id)?.read) return;
    startTransition(() => markNotificationReadAction(id));
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex size-2 items-center justify-center rounded-full bg-loss" />
            )}
          </button>
        }
      />
      <PopoverContent className="w-80 p-0" align="end">
        <PopoverHeader className="flex-row items-center justify-between px-3 pt-3">
          <PopoverTitle>Notifications</PopoverTitle>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={pending}
              onClick={() => startTransition(() => markAllNotificationsReadAction())}
            >
              Mark all read
            </Button>
          )}
        </PopoverHeader>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Nothing here yet.
            </p>
          ) : (
            notifications.map((n) => {
              const meta = TYPE_META[n.type];
              const Icon = meta.icon;
              return (
                <Link
                  key={n.id}
                  href={meta.href}
                  onClick={() => handleOpenNotification(n.id)}
                  className={`flex items-start gap-2.5 rounded-md p-2 text-left text-xs transition-colors hover:bg-muted/50 ${
                    n.read ? "" : "bg-accent/40"
                  }`}
                >
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className={n.read ? "text-muted-foreground" : "text-foreground"}>
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
