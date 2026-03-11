import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Activity,
  Bell,
  BarChart2,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "../../../src/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  exact?: boolean;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/",          exact: true, soon: true },
  { label: "Traces",    icon: Activity,        to: "/traces" },
  { label: "Alerts",    icon: Bell,            to: "/alerts",    soon: true },
  { label: "Analytics", icon: BarChart2,       to: "/analytics", soon: true },
  { label: "Settings",  icon: Settings,        to: "/settings",  soon: true },
];

export function Sidebar() {
  const { location } = useRouterState();
  const pathname = location.pathname;

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.to;
    return pathname.startsWith(item.to);
  }

  return (
    <aside className="w-56 shrink-0 border-r flex flex-col h-screen sticky top-0 bg-background">
      {/* Logo */}
      <div className="px-4 py-4 border-b flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Zap size={14} className="text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">LiteTrace</span>
        <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5">MVP</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map(item => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {item.soon && !active && (
                <span className="ml-auto text-[10px] text-muted-foreground/60">soon</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t text-xs text-muted-foreground/50">
        LiteTrace v0.1.0
      </div>
    </aside>
  );
}
