import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/format";
import { ResolveToggle } from "./resolve-toggle";
import { setIssueResolvedAction, setSuggestionResolvedAction } from "./actions";
import { Flag, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ReportRow = {
  id: string;
  resolved: boolean;
  createdAt: Date;
  userEmail: string;
  plan: string;
  pageUrl: string;
  description: string;
};

function ReportsTable({
  rows,
  action,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  rows: ReportRow[];
  action: (id: string, resolved: boolean) => Promise<void>;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Reported</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Page</TableHead>
            <TableHead>Description</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Badge variant={r.resolved ? "outline" : "default"}>
                  {r.resolved ? "Resolved" : "Open"}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(r.createdAt)}
              </TableCell>
              <TableCell className="whitespace-nowrap">{r.userEmail}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {r.plan}
              </TableCell>
              <TableCell className="max-w-48 truncate text-muted-foreground">
                {r.pageUrl}
              </TableCell>
              <TableCell className="max-w-md whitespace-pre-wrap">
                {r.description}
              </TableCell>
              <TableCell>
                <ResolveToggle id={r.id} resolved={r.resolved} action={action} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user.isAdmin) notFound();

  const [reports, suggestions] = await Promise.all([
    db.issueReport.findMany({
      orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
      include: { user: { select: { email: true } } },
    }),
    db.suggestion.findMany({
      orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
      include: { user: { select: { email: true } } },
    }),
  ]);

  const reportRows: ReportRow[] = reports.map((r) => ({
    id: r.id,
    resolved: r.resolved,
    createdAt: r.createdAt,
    userEmail: r.user.email,
    plan: r.plan,
    pageUrl: r.pageUrl,
    description: r.description,
  }));
  const suggestionRows: ReportRow[] = suggestions.map((s) => ({
    id: s.id,
    resolved: s.resolved,
    createdAt: s.createdAt,
    userEmail: s.user.email,
    plan: s.plan,
    pageUrl: s.pageUrl,
    description: s.description,
  }));

  const openReports = reportRows.filter((r) => !r.resolved).length;
  const openSuggestions = suggestionRows.filter((s) => !s.resolved).length;

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Issue reports and suggestions submitted from the Help page."
      />

      <Tabs defaultValue="reports">
        <TabsList variant="line">
          <TabsTrigger value="reports">
            Issue reports{openReports > 0 && ` (${openReports})`}
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            Suggestions{openSuggestions > 0 && ` (${openSuggestions})`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="mt-4">
          <ReportsTable
            rows={reportRows}
            action={setIssueResolvedAction}
            emptyIcon={Flag}
            emptyTitle="No reports yet"
            emptyDescription="Reports submitted from the Help page will show up here."
          />
        </TabsContent>
        <TabsContent value="suggestions" className="mt-4">
          <ReportsTable
            rows={suggestionRows}
            action={setSuggestionResolvedAction}
            emptyIcon={Lightbulb}
            emptyTitle="No suggestions yet"
            emptyDescription="Ideas submitted from the Help page will show up here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
