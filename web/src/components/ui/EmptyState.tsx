interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-5 text-[var(--foreground)]/30">{icon}</div>}
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-sm text-[var(--foreground)]/65">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
