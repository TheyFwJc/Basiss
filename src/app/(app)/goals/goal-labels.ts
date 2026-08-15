export const METRIC_LABELS: Record<string, string> = {
  MAX_DAILY_LOSS: "Max daily loss ($)",
  MONTHLY_PNL_TARGET: "P&L target ($)",
  TRADE_COUNT: "Trade count",
  WIN_RATE: "Win rate (%)",
  AVERAGE_R: "Average R",
  RULE_FOLLOWING: "Rule adherence (1-5)",
};

export const PERIOD_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

/** Natural-language phrase for use in sentences, e.g. "on track {phrase}". */
export const PERIOD_PHRASES: Record<string, string> = {
  DAILY: "today",
  WEEKLY: "this week",
  MONTHLY: "this month",
  YEARLY: "this year",
};
