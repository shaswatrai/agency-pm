import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,520px)]">
      {/* Marketing pane */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary/95 via-primary to-[hsl(262_60%_45%)] lg:block">
        <div className="absolute inset-0 opacity-25 mix-blend-overlay">
          <svg className="size-full" preserveAspectRatio="none">
            <defs>
              <pattern
                id="dots"
                x="0"
                y="0"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="4" cy="4" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
        <div className="relative z-10 flex h-full flex-col p-12 text-primary-foreground">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-white/15 backdrop-blur">
              <Sparkles className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Atelier</span>
          </Link>
          <div className="mt-auto space-y-6">
            <p className="text-sm uppercase tracking-[0.2em] opacity-80">
              Project management
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight">
              Move beautifully crafted projects across the finish line.
            </h1>
            <p className="max-w-md text-sm leading-relaxed opacity-90">
              Plan in Kanban, ship in Sprints, review in Calendar, brief in Mind
              maps — all under one roof. Built for agencies that take design
              seriously.
            </p>
            <div className="flex gap-3 pt-4">
              {["Kanban", "Gantt", "Mind map", "Sprints", "Calendar"].map(
                (label, i) => (
                  <span
                    key={label}
                    className="rounded-pill bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form pane */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
