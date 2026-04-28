"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { SprintBoard } from "@/components/views/SprintBoard";
import { TaskDetailDrawer } from "@/components/views/TaskDetailDrawer";
import { useStore } from "@/lib/db/store";
import type { TaskStatus } from "@/lib/design/tokens";
import { toast } from "sonner";

export default function SprintPage() {
  const params = useParams<{ projectId: string }>();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const addTask = useStore((s) => s.addTask);

  const handleAddTask = (status: TaskStatus) => {
    const task = addTask({
      projectId: params.projectId,
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
    setOpenTaskId(task.id);
    toast.success("Task added to sprint");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <SprintBoard
          projectId={params.projectId}
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
