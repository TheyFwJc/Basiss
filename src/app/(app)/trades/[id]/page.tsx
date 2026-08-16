import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatSignedNumber,
} from "@/lib/format";
import { canUseFeature } from "@/lib/subscription";
import { DeleteTradeButton } from "./delete-trade-button";
import { ReviewForm } from "./review-form";
import { ScreenshotGallery } from "./screenshot-gallery";

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-numeric tabular-nums">{value}</span>
    </div>
  );
}

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;
  const canUploadScreenshots = await canUseFeature(userId, "SCREENSHOTS");

  const trade = await db.trade.findFirst({
    where: { id, userId },
    include: {
      tradingAccount: true,
      strategy: true,
      playbook: true,
      executions: { orderBy: { executedAt: "asc" } },
      mistakes: { include: { mistake: true } },
      checklistEntries: {
        where: { completed: true },
        include: { checklistItem: { include: { checklist: true } } },
      },
      screenshots: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!trade) notFound();

  const netPnl = trade.netPnl ? Number(trade.netPnl) : null;
  const pnlClass =
    netPnl == null ? "text-foreground" : netPnl >= 0 ? "text-profit" : "text-loss";
  const duration = trade.exitAt
    ? formatDuration(trade.entryAt.getTime(), trade.exitAt.getTime())
    : null;

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            render={
              <Link href="/trades">
                <ArrowLeft className="size-3.5" />
                Back to trades
              </Link>
            }
            nativeButton={false}
            variant="ghost"
            size="xs"
            className="mb-2"
          />
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {trade.symbol}
            </h1>
            <Badge variant={trade.direction === "LONG" ? "default" : "secondary"}>
              {trade.direction}
            </Badge>
            <Badge variant={trade.status === "OPEN" ? "outline" : "secondary"}>
              {trade.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {trade.tradingAccount.name} · {formatDateTime(trade.entryAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            render={
              <Link href={`/trades/${trade.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            }
            nativeButton={false}
            variant="outline"
            size="sm"
          />
          <DeleteTradeButton id={trade.id} symbol={trade.symbol} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net P&L</p>
            <p className={`mt-1 font-numeric text-xl font-semibold tabular-nums ${pnlClass}`}>
              {netPnl == null ? "—" : formatCurrency(netPnl, trade.tradingAccount.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">R multiple</p>
            <p className="mt-1 font-numeric text-xl font-semibold tabular-nums">
              {trade.rMultiple ? `${formatSignedNumber(trade.rMultiple.toString())}R` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="mt-1 font-numeric text-xl font-semibold tabular-nums">
              {trade.quantity.toString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="mt-1 font-numeric text-xl font-semibold tabular-nums">
              {duration ?? "Open"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution</CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow
              label="Avg entry"
              value={formatCurrency(trade.avgEntryPrice.toString(), trade.tradingAccount.currency)}
            />
            <StatRow
              label="Avg exit"
              value={
                trade.avgExitPrice
                  ? formatCurrency(trade.avgExitPrice.toString(), trade.tradingAccount.currency)
                  : "—"
              }
            />
            <StatRow
              label="Stop loss"
              value={
                trade.stopLoss
                  ? formatCurrency(trade.stopLoss.toString(), trade.tradingAccount.currency)
                  : "—"
              }
            />
            <StatRow
              label="Take profit"
              value={
                trade.takeProfit
                  ? formatCurrency(trade.takeProfit.toString(), trade.tradingAccount.currency)
                  : "—"
              }
            />
            <StatRow
              label="Risk amount"
              value={
                trade.riskAmount
                  ? formatCurrency(trade.riskAmount.toString(), trade.tradingAccount.currency)
                  : "—"
              }
            />
            <StatRow
              label="Gross P&L"
              value={
                trade.grossPnl
                  ? formatCurrency(trade.grossPnl.toString(), trade.tradingAccount.currency)
                  : "—"
              }
            />
            <StatRow label="Fees" value={formatCurrency(trade.fees.toString())} />
            <StatRow label="Commission" value={formatCurrency(trade.commission.toString())} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <StatRow label="Strategy" value={trade.strategy?.name ?? "—"} />
            <StatRow label="Playbook" value={trade.playbook?.name ?? "—"} />
            <StatRow label="Session" value={trade.session ?? "—"} />
            <StatRow label="Market condition" value={trade.marketCondition ?? "—"} />
            <Separator className="my-2" />
            <StatRow label="Emotion (before)" value={trade.emotionBefore ?? "—"} />
            <StatRow label="Emotion (during)" value={trade.emotionDuring ?? "—"} />
            <StatRow label="Emotion (after)" value={trade.emotionAfter ?? "—"} />
            <StatRow label="Confidence" value={trade.confidence ?? "—"} />
            <StatRow label="Execution quality" value={trade.executionRating ?? "—"} />
            <StatRow label="Rule adherence" value={trade.ruleAdherence ?? "—"} />
            <Separator className="my-2" />
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">Mistakes</span>
              {trade.mistakes.length === 0 ? (
                <span className="font-numeric tabular-nums">—</span>
              ) : (
                <div className="flex flex-wrap justify-end gap-1">
                  {trade.mistakes.map(({ mistake }) => (
                    <Badge key={mistake.id} variant="destructive">
                      {mistake.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Executions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {trade.executions.map((execution) => (
            <div
              key={execution.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <Badge variant={execution.side === "BUY" ? "default" : "secondary"}>
                {execution.side}
              </Badge>
              <span className="font-numeric tabular-nums text-muted-foreground">
                {execution.quantity.toString()} @{" "}
                {formatCurrency(execution.price.toString(), trade.tradingAccount.currency)}
              </span>
              <span className="text-muted-foreground">
                {formatDateTime(execution.executedAt)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Screenshots</CardTitle>
        </CardHeader>
        <CardContent>
          <ScreenshotGallery
            tradeId={trade.id}
            screenshots={trade.screenshots}
            canUpload={canUploadScreenshots}
          />
        </CardContent>
      </Card>

      {trade.checklistEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checklist</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {trade.checklistEntries.map((entry) => (
              <p key={entry.checklistItemId} className="text-sm">
                <span className="text-profit">✓</span> {entry.checklistItem.label}{" "}
                <span className="text-xs text-muted-foreground">
                  ({entry.checklistItem.checklist.name})
                </span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {(trade.notesBefore || trade.notesDuring || trade.notesAfter) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Before</p>
              <p className="text-sm whitespace-pre-wrap">{trade.notesBefore || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">During</p>
              <p className="text-sm whitespace-pre-wrap">{trade.notesDuring || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">After</p>
              <p className="text-sm whitespace-pre-wrap">{trade.notesAfter || "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewForm
            tradeId={trade.id}
            reviewWhatWentWell={trade.reviewWhatWentWell}
            reviewWhatWentWrong={trade.reviewWhatWentWrong}
            reviewWhatToChange={trade.reviewWhatToChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
