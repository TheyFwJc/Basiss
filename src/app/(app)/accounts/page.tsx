import { Plus, Wallet, MoreHorizontal } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { AccountFormDialog } from "./account-form-dialog";
import { EditAccountItem } from "./edit-account-item";
import { DeleteAccountButton } from "./delete-account-button";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BROKERAGE: "Brokerage",
  FUTURES: "Futures",
  FOREX: "Forex",
  CRYPTO: "Crypto",
  PROP_FIRM: "Prop firm",
  PAPER: "Paper trading",
  OTHER: "Other",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  CLOSED: "outline",
};

export default async function AccountsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const accounts = await db.tradingAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Trading Accounts"
        description="Manage the accounts you trade with. Filter every other page by account."
        actions={
          <AccountFormDialog
            trigger={
              <button type="button" className={buttonVariants({ size: "sm" })}>
                <Plus className="size-4" />
                Add account
              </button>
            }
          />
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No trading accounts yet"
          description="Add your first account — brokerage, futures, forex, crypto, prop firm, or paper — to start journaling trades against it."
          actions={
            <AccountFormDialog
              trigger={
                <button type="button" className={buttonVariants({ size: "sm" })}>
                  <Plus className="size-4" />
                  Add your first account
                </button>
              }
            />
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead className="text-right">Starting balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.accountType]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.broker || "—"}
                    </TableCell>
                    <TableCell className="text-right font-numeric tabular-nums">
                      {formatCurrency(account.startingBalance.toString(), account.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[account.status]}>
                        {account.status.charAt(0) + account.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(account.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button
                              type="button"
                              aria-label={`Actions for ${account.name}`}
                              className={buttonVariants({ variant: "ghost", size: "icon", className: "size-8" })}
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <EditAccountItem
                            account={{
                              id: account.id,
                              name: account.name,
                              broker: account.broker,
                              accountType: account.accountType,
                              startingBalance: account.startingBalance.toString(),
                              currency: account.currency,
                              status: account.status,
                              notes: account.notes,
                            }}
                          />
                          <DeleteAccountButton id={account.id} name={account.name} />
                        </DropdownMenuContent>
                      </DropdownMenu>
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
