import { Plus, BookOpen, MoreHorizontal } from "lucide-react";
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
import { PlaybookFormDialog } from "./playbook-form-dialog";
import { EditPlaybookItem } from "./edit-playbook-item";
import { DeletePlaybookButton } from "./delete-playbook-button";

export default async function PlaybooksPage() {
  const session = await auth();
  const userId = session!.user.id;

  const playbooks = await db.playbook.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { trades: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Playbooks"
        description="Codify your setups with entry, stop, and target rules — plus a checklist."
        actions={
          <PlaybookFormDialog
            trigger={
              <button type="button" className={buttonVariants({ size: "sm" })}>
                <Plus className="size-4" />
                New playbook
              </button>
            }
          />
        }
      />

      {playbooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No playbooks yet"
          description="Write down a setup's entry, stop, and target rules once, then tag trades with it to see how well you actually follow it."
          actions={
            <PlaybookFormDialog
              trigger={
                <button type="button" className={buttonVariants({ size: "sm" })}>
                  <Plus className="size-4" />
                  Create your first playbook
                </button>
              }
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((playbook) => (
            <Card key={playbook.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">{playbook.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`Actions for ${playbook.name}`}
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
                    <EditPlaybookItem
                      playbook={{
                        id: playbook.id,
                        name: playbook.name,
                        setupDescription: playbook.setupDescription,
                        entryRules: playbook.entryRules,
                        stopRules: playbook.stopRules,
                        targetRules: playbook.targetRules,
                        invalidations: playbook.invalidations,
                      }}
                    />
                    <DeletePlaybookButton id={playbook.id} name={playbook.name} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {playbook.setupDescription && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {playbook.setupDescription}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {playbook._count.trades} trade
                  {playbook._count.trades === 1 ? "" : "s"} tagged
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
