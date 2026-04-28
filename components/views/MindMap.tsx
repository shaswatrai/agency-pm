"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Handle,
  Position,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import { STATUS_META, type TaskStatus } from "@/lib/design/tokens";
import type { Task } from "@/types/domain";

interface MindMapProps {
  projectId: string;
  onOpenTask: (taskId: string) => void;
}

const PROJECT_COLOR = "hsl(221 83% 53%)";

function ProjectNode({ data }: { data: { label: string; subtitle?: string } }) {
  return (
    <div className="rounded-xl border-2 border-primary bg-primary px-5 py-3 text-primary-foreground shadow-lg">
      <p className="text-[10px] uppercase tracking-wider opacity-80">Project</p>
      <p className="text-sm font-semibold">{data.label}</p>
      {data.subtitle ? (
        <p className="text-[11px] opacity-80">{data.subtitle}</p>
      ) : null}
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </div>
  );
}

function PhaseNode({ data }: { data: { label: string; count: number } }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-2.5 shadow-md">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
        Phase
      </p>
      <p className="text-sm font-semibold">{data.label}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        {data.count} tasks
      </p>
      <Handle type="target" position={Position.Left} className="!bg-border" />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-border"
      />
    </div>
  );
}

function TaskNode({
  data,
}: {
  data: { task: Task; onOpen: (id: string) => void };
}) {
  const meta = STATUS_META[data.task.status as TaskStatus];
  return (
    <button
      onClick={() => data.onOpen(data.task.id)}
      className={cn(
        "flex max-w-[220px] items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", meta.dot)} />
      <span className="truncate text-xs font-medium">{data.task.title}</span>
      <Handle type="target" position={Position.Left} className="!bg-border" />
    </button>
  );
}

const nodeTypes = {
  project: ProjectNode,
  phase: PhaseNode,
  task: TaskNode,
};

function MindMapInner({ projectId, onOpenTask }: MindMapProps) {
  const allTasks = useStore((s) => s.tasks);
  const allPhases = useStore((s) => s.phases);
  const allProjects = useStore((s) => s.projects);

  const project = allProjects.find((p) => p.id === projectId);
  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === projectId),
    [allPhases, projectId],
  );
  const tasks = useMemo(
    () => allTasks.filter((t) => t.projectId === projectId),
    [allTasks, projectId],
  );

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];

    // Filter to phases with tasks
    const phasesWithTasks = phases
      .map((ph) => ({
        phase: ph,
        tasks: tasks.filter((t) => t.phaseId === ph.id),
      }))
      .filter((p) => p.tasks.length > 0);

    const orphan = tasks.filter((t) => !t.phaseId);

    const phaseEntries = [
      ...phasesWithTasks,
      ...(orphan.length > 0
        ? [
            {
              phase: {
                id: "no_phase",
                projectId,
                name: "Unassigned",
                position: 999,
                isComplete: false,
              },
              tasks: orphan,
            },
          ]
        : []),
    ];

    const totalRows = phaseEntries.reduce(
      (sum, p) => sum + p.tasks.length,
      0,
    );
    const rowHeight = 50;
    const totalHeight = totalRows * rowHeight;

    if (project) {
      ns.push({
        id: "project",
        type: "project",
        position: { x: 0, y: totalHeight / 2 - 30 },
        data: {
          label: project.name,
          subtitle: `${tasks.length} tasks · ${phaseEntries.length} phases`,
        },
        draggable: true,
      });
    }

    let cursorY = 0;
    phaseEntries.forEach((entry, idx) => {
      const phaseTaskCount = entry.tasks.length;
      const phaseY = cursorY + (phaseTaskCount * rowHeight) / 2 - 25;
      const phaseId = `phase-${entry.phase.id}`;

      ns.push({
        id: phaseId,
        type: "phase",
        position: { x: 360, y: phaseY },
        data: { label: entry.phase.name, count: phaseTaskCount },
        draggable: true,
      });

      es.push({
        id: `e-project-${phaseId}`,
        source: "project",
        target: phaseId,
        type: "smoothstep",
        style: { stroke: PROJECT_COLOR, strokeWidth: 1.5 },
        animated: idx % 2 === 0,
      });

      entry.tasks.forEach((t, ti) => {
        const taskId = `task-${t.id}`;
        ns.push({
          id: taskId,
          type: "task",
          position: { x: 680, y: cursorY + ti * rowHeight },
          data: { task: t, onOpen: onOpenTask },
          draggable: true,
        });
        es.push({
          id: `e-${phaseId}-${taskId}`,
          source: phaseId,
          target: taskId,
          type: "smoothstep",
          style: { stroke: "hsl(220 13% 70%)", strokeWidth: 1 },
        });
      });
      cursorY += phaseTaskCount * rowHeight;
    });

    return { nodes: ns, edges: es };
  }, [project, phases, tasks, projectId, onOpenTask]);

  return (
    <div className="h-full w-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          gap={24}
          size={1}
          color="hsl(220 13% 91%)"
          className="dark:opacity-20"
        />
        <Controls
          showInteractive={false}
          className="!rounded-md !border !bg-card"
        />
        <MiniMap
          pannable
          zoomable
          maskColor="hsl(220 13% 91% / 0.6)"
          nodeColor={(n) => {
            if (n.type === "project") return "hsl(221 83% 53%)";
            if (n.type === "phase") return "hsl(220 14% 80%)";
            return "hsl(220 14% 90%)";
          }}
          className="!rounded-md !border !bg-card"
        />
      </ReactFlow>
    </div>
  );
}

export function MindMap(props: MindMapProps) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  );
}
