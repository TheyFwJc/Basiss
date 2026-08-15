import { Plus, AlertTriangle, MoreHorizontal } from "lucide-react";
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
import { MistakeFormDialog } from "./mistake-form-dialog";
import { EditMistakeItem } from "./edit-mistake-item";
import { DeleteMistakeButton } from "./delete-mistake-button";

export default async function MistakesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const mistakes = await db.mistake.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { trades: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Mistakes"
        description="Track recurring mistakes and tag trades with them to see how often — and how expensive — they are."
        actions={
          <MistakeFormDialog
            trigger={
              <button type="button" className={buttonVariants({ size: "sm" })}>
                <Plus className="size-4" />
                New mistake
              </button>
            }
          />
        }
      />

      {mistakes.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No mistakes tracked yet"
          description="Define the mistakes you want to catch yourself making (e.g. moved stop, oversized position, revenge trade), then tag trades with them as you log them."
          actions={
            <MistakeFormDialog
              trigger={
                <button type="button" className={buttonVariants({ size: "sm" })}>
                  <Plus className="size-4" />
                  Track your first mistake
                </button>
              }
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mistakes.map((mistake) => (
            <Card key={mistake.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">{mistake.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`Actions for ${mistake.name}`}
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
                    <EditMistakeItem
                      mistake={{
                        id: mistake.id,
                        name: mistake.name,
                        description: mistake.description,
                      }}
                    />
                    <DeleteMistakeButton id={mistake.id} name={mistake.name} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {mistake.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {mistake.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {mistake._count.trades} trade
                  {mistake._count.trades === 1 ? "" : "s"} tagged
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
