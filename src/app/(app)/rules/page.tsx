import { Plus, ScrollText, MoreHorizontal } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RuleFormDialog } from "./rule-form-dialog";
import { EditRuleItem } from "./edit-rule-item";
import { DeleteRuleButton } from "./delete-rule-button";

export default async function RulesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const rules = await db.rule.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Rules"
        description="The rules you trade by — a reference list to keep yourself honest."
        actions={
          <RuleFormDialog
            trigger={
              <button type="button" className={buttonVariants({ size: "sm" })}>
                <Plus className="size-4" />
                New rule
              </button>
            }
          />
        }
      />

      {rules.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No rules written down yet"
          description="Write out the rules you trade by (e.g. no trades in the last 30 minutes, max 2 trades a day) so they're always one click away."
          actions={
            <RuleFormDialog
              trigger={
                <button type="button" className={buttonVariants({ size: "sm" })}>
                  <Plus className="size-4" />
                  Add your first rule
                </button>
              }
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">{rule.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`Actions for ${rule.name}`}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon",
                          className: "size-8 shrink-0",
                        })}
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <EditRuleItem
                      rule={{ id: rule.id, name: rule.name, description: rule.description }}
                    />
                    <DeleteRuleButton id={rule.id} name={rule.name} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              {rule.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
