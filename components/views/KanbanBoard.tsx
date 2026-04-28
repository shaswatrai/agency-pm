"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { useStore } from "@/lib/db/store";
import { applyTaskFilter, useFilterFor } from "@/lib/db/filters";
import { KANBAN_COLUMNS, STATUS_META, type TaskStatus } from "@/lib/design/tokens";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import type { Task } from "@/types/domain";

interface KanbanBoardProps {
  projectId: string;
  onOpenTask: (taskId: string) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function KanbanBoard({
  projectId,
  onOpenTask,
  onAddTask,
}: KanbanBoardProps) {
  const allTasks = useStore((s) => s.tasks);
  const filter = useFilterFor(projectId);
  const tasks = useMemo(
    () =>
      applyTaskFilter(
        allTasks.filter((t) => t.projectId === projectId),
        filter,
      ),
    [allTasks, projectId, filter],
  );
  const moveTask = useStore((s) => s.moveTask);

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const tasksByColumn = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    KANBAN_COLUMNS.forEach((col) => map.set(col, []));
    for (const t of tasks) {
      if (KANBAN_COLUMNS.includes(t.status)) {
        map.get(t.status)!.push(t);
      }
    }
    map.forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return map;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const t = event.active.data.current?.task as Task | undefined;
    if (t) setActiveTask(t);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const draggedTask = active.data.current?.task as Task | undefined;
    if (!draggedTask) return;

    const overId = String(over.id);

    let targetStatus: TaskStatus | null = null;
    let targetIndex = 0;

    if (overId.startsWith("column-")) {
      targetStatus = overId.replace("column-", "") as TaskStatus;
      targetIndex = (tasksByColumn.get(targetStatus) ?? []).length;
    } else {
      const overTask = over.data.current?.task as Task | undefined;
      if (overTask) {
        targetStatus = overTask.status;
        const list = tasksByColumn.get(targetStatus) ?? [];
        targetIndex = list.findIndex((t) => t.id === overTask.id);
      }
    }

    if (!targetStatus) return;
    if (
      targetStatus === draggedTask.status &&
      tasksByColumn
        .get(targetStatus)
        ?.findIndex((t) => t.id === draggedTask.id) === targetIndex
    ) {
      return;
    }

    const newPosition = (targetIndex + 1) * 1000;
    moveTask(draggedTask.id, targetStatus, newPosition);

    if (targetStatus !== draggedTask.status) {
      toast.success(`Moved to ${STATUS_META[targetStatus].label}`, {
        description: draggedTask.title,
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto px-4 pb-4 pt-2 md:px-8 scrollbar-thin">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByColumn.get(status) ?? []}
            onOpenTask={onOpenTask}
            onAddTask={onAddTask}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <KanbanCard task={activeTask} onOpen={() => {}} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
