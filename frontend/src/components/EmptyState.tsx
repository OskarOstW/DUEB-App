import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

/** Konsistenter Leer-Zustand für Listen/Ansichten ohne Daten. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      {icon && (
        <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground [&_svg]:size-7">
          {icon}
        </div>
      )}
      <p className="max-w-sm font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
