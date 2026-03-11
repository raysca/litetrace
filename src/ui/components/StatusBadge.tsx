import { cn } from "../../lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  ok:    "bg-status-ok-bg text-status-ok-text",
  error: "bg-status-error-bg text-status-error-text",
  unset: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  ok:    "success",
  error: "error",
  unset: "unset",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.unset;
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
