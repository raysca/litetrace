import { cn } from "../../lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  ok:    "bg-[#1A875420] text-[#1A8754]",
  error: "bg-[#C41E3A20] text-[#C41E3A]",
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
        "inline-flex items-center px-2 py-[3px] text-[11px] font-semibold tracking-wide uppercase",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
