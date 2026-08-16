import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <div className="bg-brand-soft mb-4 flex size-12 items-center justify-center rounded-full">
        <Icon className="text-primary size-6" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {actions && <div className="mt-6 flex items-center gap-3">{actions}</div>}
    </div>
  );
}
