import { Construction } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export function PhasePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Construction}
        title={`${title} lands in ${phase}`}
        description="The foundation (auth, accounts, database, navigation) is built first so every feature after this has real data to work with. This section isn't wired up yet — nothing here is placeholder data pretending to be real."
      />
    </div>
  );
}
