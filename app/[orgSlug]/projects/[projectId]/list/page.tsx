"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ListView } from "@/components/views/ListView";
import { TaskDetailDrawer } from "@/components/views/TaskDetailDrawer";

export default function ListPage() {
  const params = useParams<{ projectId: string }>();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <ListView projectId={params.projectId} onOpenTask={setOpenTaskId} />
      </div>
      <TaskDetailDrawer
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  );
}
