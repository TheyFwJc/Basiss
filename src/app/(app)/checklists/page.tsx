import { Plus, ClipboardCheck, MoreHorizontal } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChecklistFormDialog } from "./checklist-form-dialog";
import { EditChecklistItem } from "./edit-checklist-item";
import { DeleteChecklistButton } from "./delete-checklist-button";

export default async function ChecklistsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [checklists, playbooks] = await Promise.all([
    db.checklist.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { playbook: true, items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.playbook.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Checklists"
        description="Reusable steps to confirm before or during a trade — check them off as you log the trade."
        actions={
          <ChecklistFormDialog
            playbooks={playbooks}
            trigger={
              <button type="button" className={buttonVariants({ size: "sm" })}>
                <Plus className="size-4" />
                New checklist
              </button>
            }
          />
        }
      />

      {checklists.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No checklists yet"
          description="Write down the steps you want to confirm every time (e.g. checked the higher timeframe, sized the position), then check them off on each trade."
          actions={
            <ChecklistFormDialog
              playbooks={playbooks}
              trigger={
                <button type="button" className={buttonVariants({ size: "sm" })}>
                  <Plus className="size-4" />
                  Create your first checklist
                </button>
              }
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checklists.map((checklist) => (
            <Card key={checklist.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{checklist.name}</CardTitle>
                  {checklist.playbook && (
                    <Badge variant="outline" className="mt-1.5">
                      {checklist.playbook.name}
                    </Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`Actions for ${checklist.name}`}
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
                    <EditChecklistItem
                      playbooks={playbooks}
                      checklist={{
                        id: checklist.id,
                        name: checklist.name,
                        playbookId: checklist.playbookId,
                        items: checklist.items.map((i) => ({ label: i.label })),
                      }}
                    />
                    <DeleteChecklistButton id={checklist.id} name={checklist.name} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {checklist.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {checklist.items.map((item) => (
                      <li key={item.id}>• {item.label}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
