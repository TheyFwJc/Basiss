import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  BarChart3,
  Target,
  BookOpen,
  NotebookPen,
  ShieldAlert,
  Wallet,
  Upload,
  Settings,
  AlertTriangle,
  ClipboardCheck,
  Flag,
  Sparkles,
  HelpCircle,
  Users,
  ScrollText,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trades", href: "/trades", icon: ListChecks },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Insights", href: "/insights", icon: Sparkles },
  { label: "Strategies", href: "/strategies", icon: Target },
  { label: "Playbooks", href: "/playbooks", icon: BookOpen },
  { label: "Mistakes", href: "/mistakes", icon: AlertTriangle },
  { label: "Rules", href: "/rules", icon: ScrollText },
  { label: "Checklists", href: "/checklists", icon: ClipboardCheck },
  { label: "Journal", href: "/journal", icon: NotebookPen },
  { label: "Risk Management", href: "/risk", icon: ShieldAlert },
  { label: "Goals", href: "/goals", icon: Flag },
  { label: "Friends", href: "/friends", icon: Users },
  { label: "Accounts", href: "/accounts", icon: Wallet },
  { label: "Import", href: "/import", icon: Upload },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle },
];
