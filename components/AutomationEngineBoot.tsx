"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { startAutomationEngine } from "@/lib/automation/engine";
import { materialiseRecurringTasks } from "@/lib/automation/recurring";
import { useStore } from "@/lib/db/store";

export function AutomationEngineBoot() {
  useEffect(() => {
    // Type assertion: the engine reads/writes specific slices via the
    // store's get/set/subscribe API; full type-correctness is enforced
    // inside the engine's internal narrowing.
    startAutomationEngine(useStore as unknown as Parameters<typeof startAutomationEngine>[0]);

    // Materialise recurring task rules once on boot. The engine itself is
    // safe to call repeatedly — it uses last_run_at to avoid duplicates.
    const results = materialiseRecurringTasks();
    const total = results.reduce((s, r) => s + r.generated, 0);
    if (total > 0) {
      toast.success(`Recurring rules generated ${total} task${total === 1 ? "" : "s"}`, {
        description: results
          .map((r) => `${r.ruleName}: ${r.generated}`)
          .join(" · "),
      });
    }
  }, []);
  return null;
}
