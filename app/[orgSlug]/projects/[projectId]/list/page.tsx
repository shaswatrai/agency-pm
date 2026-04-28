"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ListView } from "@/components/views/ListView";
import { TaskDetailDrawer } from "@/components/views/TaskDetailDrawer";
import { useStore } from "@/lib/db/store";
import { applyTaskFilter, useFilterFor } from "@/lib/db/filters";

export default function ListPage() {
  const params = useParams<{ projectId: string }>();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const allTasks = useStore((s) => s.tasks);
  const filter = useFilterFor(params.projectId);

  const navIds = useMemo(
    () =>
      applyTaskFilter(
        allTasks.filter((t) => t.projectId === params.projectId),
        filter,
      ).map((t) => t.id),
    [allTasks, params.projectId, filter],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <ListView projectId={params.projectId} onOpenTask={setOpenTaskId} />
      </div>
      <TaskDetailDrawer
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
        navTaskIds={navIds}
        onNavigate={setOpenTaskId}
      />
    </div>
  );
}
