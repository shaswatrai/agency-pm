"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { MindMap } from "@/components/views/MindMap";
import { TaskDetailDrawer } from "@/components/views/TaskDetailDrawer";

export default function MindMapPage() {
  const params = useParams<{ projectId: string }>();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <MindMap projectId={params.projectId} onOpenTask={setOpenTaskId} />
      </div>
      <TaskDetailDrawer
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  );
}
