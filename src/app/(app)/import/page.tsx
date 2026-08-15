import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { ImportWizard } from "./import-wizard";
import { DeleteImportJobButton } from "./import-job-row";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  MAPPING: "Mapping",
  VALIDATING: "Validating",
  READY: "Ready",
  IMPORTING: "Importing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "FAILED") return "destructive";
  if (status === "PENDING" || status === "MAPPING") return "outline";
  return "secondary";
}

export default async function ImportPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [accounts, mappings, jobs] = await Promise.all([
    db.tradingAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    db.importMapping.findMany({
      where: { userId },
      select: { broker: true },
      orderBy: { broker: "asc" },
    }),
    db.importJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { tradingAccount: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Import"
        description="Bring in trades from a broker CSV export, with column mapping and duplicate detection."
      />

      <ImportWizard accounts={accounts} knownBrokers={mappings.map((m) => m.broker)} />

      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent imports</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Imported</TableHead>
                  <TableHead>Skipped</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-40 truncate">{job.fileName}</TableCell>
                    <TableCell>{job.broker ?? "—"}</TableCell>
                    <TableCell>{job.tradingAccount?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(job.status)}>
                        {STATUS_LABELS[job.status] ?? job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.importedCount}</TableCell>
                    <TableCell>{job.skippedCount}</TableCell>
                    <TableCell>{job.errorCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(job.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DeleteImportJobButton id={job.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
