"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  GitBranch,
  GitPullRequest,
  GitCommit,
  Github,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/db/store";
import { useIntegrationsStore } from "@/lib/integrations/store";
import { parseGithubUrl } from "@/lib/integrations/providers/github/client";
import { parseGitlabUrl } from "@/lib/integrations/providers/gitlab/client";
import type { Task } from "@/types/domain";
import { toast } from "sonner";

interface Props {
  task: Task;
}

const KIND_ICONS = {
  pr: GitPullRequest,
  branch: GitBranch,
  commit: GitCommit,
  repo: Github,
  mr: GitPullRequest,
  project: Github,
} as const;

/**
 * Repo links for a task — GitHub PRs/branches and GitLab MRs/branches.
 * Branch convention `<TASK_CODE>` in the name is what the inbound
 * webhook uses to auto-link; this UI lets users add them by hand too.
 */
export function RepoLink({ task }: Props) {
  const orgId = useStore((s) => s.organization.id);
  const meId = useStore((s) => s.currentUserId);
  const updateTask = useStore((s) => s.updateTask);
  const links = useIntegrationsStore((s) => s.links);
  const addLink = useIntegrationsStore((s) => s.addLink);
  const removeLink = useIntegrationsStore((s) => s.removeLink);

  const repoLinks = useMemo(
    () =>
      links.filter(
        (l) =>
          l.entityType === "task" &&
          l.entityId === task.id &&
          (l.provider === "github" || l.provider === "gitlab"),
      ),
    [links, task.id],
  );

  const [pasteUrl, setPasteUrl] = useState("");

  function attach() {
    const trimmed = pasteUrl.trim();
    if (!trimmed) return;

    const gh = parseGithubUrl(trimmed);
    if (gh) {
      addLink({
        organizationId: orgId,
        provider: "github",
        entityType: "task",
        entityId: task.id,
        externalKind: `github_${gh.kind}`,
        externalId: `${gh.owner}/${gh.repo}${gh.ident ? `#${gh.ident}` : ""}`,
        externalUrl: trimmed,
        metadata: { owner: gh.owner, repo: gh.repo, kind: gh.kind, ident: gh.ident },
        createdBy: meId,
      });
      if (!task.repoUrl) updateTask(task.id, { repoUrl: trimmed });
      toast.success(`GitHub ${gh.kind} linked`);
      setPasteUrl("");
      return;
    }

    const gl = parseGitlabUrl(trimmed);
    if (gl) {
      addLink({
        organizationId: orgId,
        provider: "gitlab",
        entityType: "task",
        entityId: task.id,
        externalKind: `gitlab_${gl.kind}`,
        externalId: `${gl.projectPath}${gl.ident ? `!${gl.ident}` : ""}`,
        externalUrl: trimmed,
        metadata: { projectPath: gl.projectPath, kind: gl.kind, ident: gl.ident },
        createdBy: meId,
      });
      if (!task.repoUrl) updateTask(task.id, { repoUrl: trimmed });
      toast.success(`GitLab ${gl.kind} linked`);
      setPasteUrl("");
      return;
    }

    toast.error("Couldn't parse URL — paste a github.com or gitlab.com link");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <GitBranch className="size-3" />
        Code references
      </div>

      {repoLinks.map((link) => {
        const m = link.metadata as { kind?: string };
        const kind = (m.kind ?? "repo") as keyof typeof KIND_ICONS;
        const Icon = KIND_ICONS[kind] ?? Github;
        return (
          <div
            key={link.id}
            className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs">{link.externalId}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {link.provider} · {kind}
              </p>
            </div>
            <a
              href={link.externalUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium hover:bg-accent"
            >
              <ExternalLink className="size-3" /> Open
            </a>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                removeLink(link.id);
                toast.success("Unlinked");
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
      })}

      <div className="flex gap-2">
        <Input
          placeholder="Paste GitHub or GitLab URL…"
          value={pasteUrl}
          onChange={(e) => setPasteUrl(e.target.value)}
          className="font-mono text-xs"
        />
        <Button size="sm" onClick={attach} disabled={!pasteUrl.trim()}>
          <Plus className="mr-1 size-3.5" />
          Attach
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Branch named with task code (<span className="font-mono">{task.code}</span>) auto-links
        on push via the GitHub/GitLab webhook.
      </p>
    </div>
  );
}
