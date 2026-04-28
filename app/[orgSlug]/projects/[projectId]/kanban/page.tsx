"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { KanbanBoard } from "@/components/views/KanbanBoard";
import { TaskDetailDrawer } from "@/components/views/TaskDetailDrawer";
import { useStore } from "@/lib/db/store";
import type { TaskStatus } from "@/lib/design/tokens";
import { toast } from "sonner";

export default function KanbanPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const projectId = params.projectId;
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const addTask = useStore((s) => s.addTask);

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
      />
    </div>
  );
}
