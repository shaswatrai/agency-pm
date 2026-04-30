"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  Clock,
  FileBox,
  BarChart3,
  Settings,
  Sparkles,
  Activity,
  Receipt,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  FileSignature,
  GraduationCap,
  Wallet,
  Timer,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/lib/db/store";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface SidebarProps {
  variant?: "static" | "mobile";
  onNavigate?: () => void;
}

const STORAGE_KEY = "atelier:sidebar-collapsed";

export function Sidebar({ variant = "static", onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const orgSlug = useStore((s) => s.organization.slug);
  const orgName = useStore((s) => s.organization.name);
  const allTasks = useStore((s) => s.tasks);
  const taskCount = allTasks.filter((t) => t.status !== "done").length;

  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (variant !== "static") return;
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // ignore
    }
    setHydrated(true);
  }, [variant]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isCollapsed = variant === "static" && hydrated && collapsed;

  const items: NavItem[] = [
    { href: `/${orgSlug}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/${orgSlug}/projects`, label: "Projects", icon: FolderKanban },
    { href: `/${orgSlug}/clients`, label: "Clients", icon: Users },
    {
      href: `/${orgSlug}/my-tasks`,
      label: "My tasks",
      icon: CheckSquare,
      badge: taskCount,
    },
    { href: `/${orgSlug}/timesheet`, label: "Timesheet", icon: Clock },
    { href: `/${orgSlug}/utilization`, label: "Utilization", icon: Activity },
    { href: `/${orgSlug}/skills`, label: "Skills", icon: GraduationCap },
    { href: `/${orgSlug}/quotes`, label: "Quotes", icon: FileSignature },
    { href: `/${orgSlug}/invoices`, label: "Invoices", icon: Receipt },
    {
      href: `/${orgSlug}/budget-changes`,
      label: "Budget changes",
      icon: Wallet,
    },
    { href: `/${orgSlug}/files`, label: "Files", icon: FileBox },
    { href: `/${orgSlug}/automations`, label: "Automations", icon: Zap },
    { href: `/${orgSlug}/sla`, label: "SLA dashboard", icon: Timer },
    { href: `/${orgSlug}/marketing`, label: "Marketing", icon: Megaphone },
    { href: `/${orgSlug}/reports`, label: "Reports", icon: BarChart3 },
  ];

  return (
    <aside
      className={cn(
        "shrink-0 flex flex-col border-r bg-card/50 transition-[width] duration-200",
        variant === "static" && "hidden md:flex",
        variant === "static" && (isCollapsed ? "w-[60px]" : "w-60"),
        variant === "mobile" && "flex w-full h-full",
      )}
    >
      {/* Brand / logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b",
          isCollapsed ? "justify-center px-2" : "gap-2 px-5",
        )}
      >
        <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </div>
        {!isCollapsed ? (
          <div className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-sm font-semibold tracking-tight">
              Atelier
            </span>
            <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
              {orgName}
            </span>
          </div>
        ) : null}
      </div>

      <ScrollArea className={cn("flex-1 py-4", isCollapsed ? "px-2" : "px-3")}>
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-md text-sm font-medium transition-all",
                  isCollapsed ? "justify-center px-0 py-2" : "px-3 py-2",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {!isCollapsed ? (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                ) : item.badge ? (
                  <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div
        className={cn(
          "border-t",
          isCollapsed ? "p-2 space-y-1" : "p-3 space-y-1",
        )}
      >
        <Link
          href={`/${orgSlug}/settings`}
          onClick={onNavigate}
          title={isCollapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            isCollapsed ? "justify-center py-2" : "px-3 py-2",
            pathname?.startsWith(`/${orgSlug}/settings`) &&
              "bg-accent text-foreground",
          )}
        >
          <Settings className="size-4 shrink-0" />
          {!isCollapsed ? "Settings" : null}
        </Link>
        {variant === "static" ? (
          <button
            onClick={toggleCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-3 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              isCollapsed ? "justify-center py-2" : "px-3 py-2",
            )}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="size-4 shrink-0" />
                <span className="flex-1 text-left">Collapse</span>
              </>
            )}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
