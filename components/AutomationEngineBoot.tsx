"use client";

import { useEffect } from "react";
import { startAutomationEngine } from "@/lib/automation/engine";
import { useStore } from "@/lib/db/store";

export function AutomationEngineBoot() {
  useEffect(() => {
    // Type assertion: the engine reads/writes specific slices via the
    // store's get/set/subscribe API; full type-correctness is enforced
    // inside the engine's internal narrowing.
    startAutomationEngine(useStore as unknown as Parameters<typeof startAutomationEngine>[0]);
  }, []);
  return null;
}
