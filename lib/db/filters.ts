"use client";

import { create } from "zustand";
import type { TaskStatus, TaskPriority } from "@/lib/design/tokens";
import type { Task } from "@/types/domain";

interface ProjectFilterState {
  // keyed by projectId
  filters: Record<
    string,
    {
      assigneeIds: string[];
      statuses: TaskStatus[];
      priorities: TaskPriority[];
      tags: string[];
      search: string;
    }
  >;
  setFilter: (
    projectId: string,
    patch: Partial<ProjectFilterState["filters"][string]>,
  ) => void;
  clearFilter: (projectId: string) => void;
}

const EMPTY_FILTER = {
  assigneeIds: [],
  statuses: [],
  priorities: [],
  tags: [],
  search: "",
};

export const useProjectFilters = create<ProjectFilterState>((set) => ({
  filters: {},
  setFilter: (projectId, patch) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [projectId]: { ...EMPTY_FILTER, ...state.filters[projectId], ...patch },
      },
    }));
  },
  clearFilter: (projectId) => {
    set((state) => {
      const next = { ...state.filters };
      delete next[projectId];
      return { filters: next };
    });
  },
}));

export function useFilterFor(projectId: string) {
  return useProjectFilters(
    (s) => s.filters[projectId] ?? EMPTY_FILTER,
  );
}

export function applyTaskFilter(
  tasks: Task[],
  filter: ReturnType<typeof useFilterFor>,
): Task[] {
  return tasks.filter((t) => {
    if (filter.assigneeIds.length > 0) {
      const overlap = t.assigneeIds.some((id) =>
        filter.assigneeIds.includes(id),
      );
      if (!overlap) return false;
    }
    if (filter.statuses.length > 0 && !filter.statuses.includes(t.status))
      return false;
    if (
      filter.priorities.length > 0 &&
      !filter.priorities.includes(t.priority)
    )
      return false;
    if (filter.tags.length > 0) {
      const overlap = t.tags.some((g) => filter.tags.includes(g));
      if (!overlap) return false;
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (
        !t.title.toLowerCase().includes(q) &&
        !t.code.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}

export function countActiveFilters(
  filter: ReturnType<typeof useFilterFor>,
): number {
  return (
    (filter.assigneeIds.length > 0 ? 1 : 0) +
    (filter.statuses.length > 0 ? 1 : 0) +
    (filter.priorities.length > 0 ? 1 : 0) +
    (filter.tags.length > 0 ? 1 : 0) +
    (filter.search ? 1 : 0)
  );
}
