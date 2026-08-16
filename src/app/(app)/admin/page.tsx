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
import { formatDateTime } from "@/lib/format";
import { ResolveToggle } from "./resolve-toggle";
import { Flag } from "lucide-react";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user.isAdmin) notFound();

  const reports = await db.issueReport.findMany({
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { email: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Issue reports"
        description="Bug/feedback reports submitted from the Help page."
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No reports yet"
          description="Reports submitted from the Help page will show up here."
        />
      ) : (
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
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant={r.resolved ? "outline" : "default"}>
                      {r.resolved ? "Resolved" : "Open"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{r.user.email}</TableCell>
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
                    <ResolveToggle id={r.id} resolved={r.resolved} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
