"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { useStore } from "@/lib/db/store";
import { cn } from "@/lib/utils";
import type { SkillProficiency } from "@/types/domain";

const PROFICIENCY_LABELS: Record<SkillProficiency, string> = {
  0: "—",
  1: "Novice",
  2: "Intermediate",
  3: "Advanced",
  4: "Expert",
};

const PROFICIENCY_COLORS: Record<SkillProficiency, string> = {
  0: "bg-muted/40 text-muted-foreground",
  1: "bg-status-todo/30 text-foreground",
  2: "bg-status-progress/30 text-foreground",
  3: "bg-status-done/40 text-foreground",
  4: "bg-status-done text-white",
};

export default function SkillsPage() {
  const users = useStore((s) => s.users);
  const skills = useStore((s) => s.skills);
  const userSkills = useStore((s) => s.userSkills);
  const setUserSkill = useStore((s) => s.setUserSkill);

  const [query, setQuery] = useState("");
  const [filterSkill, setFilterSkill] = useState<string | null>(null);

  const filteredSkills = skills.filter((s) =>
    s.toLowerCase().includes(query.toLowerCase()),
  );

  // If filtering by a specific skill, sort users by proficiency in that skill
  const orderedUsers = useMemo(() => {
    if (!filterSkill) return users;
    const ranked = users.map((u) => {
      const us = userSkills.find(
        (x) => x.userId === u.id && x.skill === filterSkill,
      );
      return { user: u, prof: us?.proficiency ?? 0 };
    });
    ranked.sort((a, b) => b.prof - a.prof);
    return ranked.map((r) => r.user);
  }, [filterSkill, userSkills, users]);

  const proficiencyFor = (
    userId: string,
    skill: string,
  ): SkillProficiency => {
    const found = userSkills.find(
      (x) => x.userId === userId && x.skill === skill,
    );
    return (found?.proficiency ?? 0) as SkillProficiency;
  };

  const cycleProficiency = (userId: string, skill: string) => {
    const current = proficiencyFor(userId, skill);
    const next = ((current + 1) % 5) as SkillProficiency;
    setUserSkill(userId, skill, next);
  };

  const skillsCovered = filteredSkills.filter((s) =>
    userSkills.some((us) => us.skill === s),
  ).length;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
            <Sparkles className="size-6 text-primary" /> Skill matrix
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find the right person for the job · click any cell to cycle
            proficiency
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border bg-card px-4 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Skills covered
            </p>
            <p className="mt-0.5 font-mono text-lg font-semibold">
              {skillsCovered}
              <span className="text-sm text-muted-foreground">
                /{skills.length}
              </span>
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter skills…"
            className="pl-9"
          />
        </div>
        {filterSkill ? (
          <button
            onClick={() => setFilterSkill(null)}
            className="inline-flex items-center gap-1 rounded-pill border bg-card px-3 py-1 text-xs"
          >
            <Filter className="size-3" />
            Sorted by{" "}
            <span className="font-medium text-foreground">{filterSkill}</span>
            <span className="ml-1 text-muted-foreground hover:text-foreground">
              ×
            </span>
          </button>
        ) : null}

        {/* Legend */}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Levels:</span>
          {([1, 2, 3, 4] as SkillProficiency[]).map((p) => (
            <span
              key={p}
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                PROFICIENCY_COLORS[p],
              )}
            >
              {p} {PROFICIENCY_LABELS[p]}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/30 px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Skill
              </th>
              {orderedUsers.map((u) => (
                <th
                  key={u.id}
                  className="px-2 py-2 text-center text-[10px] font-medium text-muted-foreground"
                >
                  <div className="mx-auto flex w-12 flex-col items-center gap-1">
                    <UserAvatar
                      user={{
                        name: u.fullName,
                        avatarUrl: u.avatarUrl,
                      }}
                      size="xs"
                    />
                    <span className="truncate text-[10px]">
                      {u.fullName.split(" ")[0]}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSkills.map((skill, i) => (
              <motion.tr
                key={skill}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  "border-t",
                  filterSkill === skill && "bg-primary/5",
                )}
              >
                <td className="sticky left-0 z-10 bg-card px-4 py-2">
                  <button
                    onClick={() =>
                      setFilterSkill(filterSkill === skill ? null : skill)
                    }
                    className={cn(
                      "text-left text-sm font-medium hover:text-primary",
                      filterSkill === skill && "text-primary",
                    )}
                  >
                    {skill}
                  </button>
                </td>
                {orderedUsers.map((u) => {
                  const prof = proficiencyFor(u.id, skill);
                  return (
                    <td key={u.id} className="px-1 py-1.5">
                      <button
                        onClick={() => cycleProficiency(u.id, skill)}
                        title={`${u.fullName} · ${PROFICIENCY_LABELS[prof]}`}
                        className={cn(
                          "mx-auto block grid size-9 place-items-center rounded-md text-xs font-mono font-medium transition-all hover:scale-110",
                          PROFICIENCY_COLORS[prof],
                        )}
                      >
                        {prof === 0 ? "—" : prof}
                      </button>
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSkills.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No skills match "{query}".
        </p>
      ) : null}
    </div>
  );
}
