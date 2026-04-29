"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Sun, Moon, HelpCircle, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Link from "next/link";
import { CommandPalette } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";
import { PresenceIndicator } from "./PresenceIndicator";
import { ConnectionBadge } from "./ConnectionBadge";
import { Sidebar } from "./Sidebar";
import { UserAvatar } from "@/components/UserAvatar";
import { useCurrentUser, useStore } from "@/lib/db/store";

export function Topbar() {
  const [mounted, setMounted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const currentUser = useCurrentUser();
  const orgName = useStore((s) => s.organization.name);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerSearch = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true }),
    );
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md md:gap-3 md:px-6">
      <CommandPalette />

      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-4" />
      </Button>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar
            variant="mobile"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <button
        onClick={triggerSearch}
        className="group flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:min-w-[280px]"
      >
        <Search className="size-4" />
        <span className="hidden flex-1 text-left sm:inline">Search…</span>
        <kbd className="hidden rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      <div className="hidden md:block">
        <ConnectionBadge />
      </div>

      <div className="hidden lg:block">
        <PresenceIndicator />
      </div>

      <Button
        size="sm"
        className="hidden sm:inline-flex"
        onClick={() =>
          window.dispatchEvent(new Event("atelier:open-quick-capture"))
        }
      >
        <Plus className="size-4" /> New
        <kbd className="ml-1 rounded bg-primary-foreground/15 px-1 py-0.5 font-mono text-[9px]">
          C
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const ev = new KeyboardEvent("keydown", { key: "?" });
          window.dispatchEvent(ev);
        }}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <HelpCircle className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() =>
          setTheme(resolvedTheme === "dark" ? "light" : "dark")
        }
        aria-label="Toggle theme"
        suppressHydrationWarning
      >
        {mounted && resolvedTheme === "dark" ? (
          <Moon className="size-4" />
        ) : (
          <Sun className="size-4" />
        )}
      </Button>

      <NotificationCenter />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <UserAvatar user={{ name: currentUser.fullName, avatarUrl: currentUser.avatarUrl }} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{orgName}</DropdownMenuLabel>
          <DropdownMenuItem>
            <span className="flex flex-col">
              <span className="font-medium">{currentUser.fullName}</span>
              <span className="text-xs text-muted-foreground">
                {currentUser.email}
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/atelier/profile/${currentUser.id}`}>
              Your profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/atelier/settings`}>Workspace settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async (e) => {
              e.preventDefault();
              const { signOut } = await import("@/lib/auth");
              await signOut();
              window.location.assign("/login");
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
