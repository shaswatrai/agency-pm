"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { KanbanBoard } from "@/components/views/KanbanBoard";
import { TaskDetailDrawer } from "@/components/views/TaskDetailDrawer";
import { useStore } from "@/lib/db/store";
import { applyTaskFilter, useFilterFor } from "@/lib/db/filters";
import { KANBAN_COLUMNS, type TaskStatus } from "@/lib/design/tokens";
import { toast } from "sonner";

export default function KanbanPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const projectId = params.projectId;
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const addTask = useStore((s) => s.addTask);
  const allTasks = useStore((s) => s.tasks);
  const filter = useFilterFor(projectId);

  // Build the j/k cycle order matching what's displayed on the board
  // (filtered + sorted by column then position).
  const navIds = useMemo(() => {
    const filtered = applyTaskFilter(
      allTasks.filter((t) => t.projectId === projectId),
      filter,
    );
    const ordered: string[] = [];
    for (const col of KANBAN_COLUMNS) {
      const inCol = filtered
        .filter((t) => t.status === col)
        .sort((a, b) => a.position - b.position);
      for (const t of inCol) ordered.push(t.id);
    }
    return ordered;
  }, [allTasks, projectId, filter]);

  useEffect(() => {
    const queryTask = searchParams.get("task");
    if (queryTask) setOpenTaskId(queryTask);
  }, [searchParams]);

  const handleAddTask = (status: TaskStatus) => {
    const newTask = addTask({
      projectId,
      title: "New task",
      status,
      priority: "medium",
      assigneeIds: [],
      clientVisible: false,
      tags: [],
      actualHours: 0,
      commentCount: 0,
      attachmentCount: 0,
      subtaskCount: 0,
      subtasksDone: 0,
    });
    setOpenTaskId(newTask.id);
    toast.success("Task created — give it a title");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <KanbanBoard
          projectId={projectId}
          onOpenTask={setOpenTaskId}
          onAddTask={handleAddTask}
        />
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
