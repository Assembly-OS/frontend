"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { Badge, DateField, FIELD, Select } from "@/components/ui";
import { TaskList } from "@/components/task-list";
import { initials } from "@/lib/format";
import {
  PRIORITIES,
  TASK_STATUSES,
  priorityTone,
  statusTone,
  type Priority,
  type TaskRow,
} from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";

export interface Candidate {
  id: number;
  login: string;
  full_name: string;
  role: string;
  position: string | null;
  group: string;
}

export interface ProjectOption {
  id: number;
  code: string;
  name: string;
}

/** Tab order for the "departments you can assign to" strip. */
const GROUP_ORDER = ["TEAM", "GR", "FR", "BR", "PR", "AI_LAB", "UYUSHMA", "LOYIHA"];

function groupLabel(group: string, t: (key: MessageKey) => string): string {
  if (group === "TEAM") return t("team.title");
  if (group === "UYUSHMA") return t("role.UYUSHMA_RAISI");
  if (group === "LOYIHA") return t("role.LOYIHA_RAHBARI");
  return t(`dept.${group}` as MessageKey).split(" — ")[0];
}

export function AssignForm({
  candidates,
  projects,
}: {
  candidates: Candidate[];
  projects: ProjectOption[];
}) {
  const t = useT();
  const router = useRouter();

  const groups = useMemo(() => {
    const present = new Set(candidates.map((c) => c.group));
    return GROUP_ORDER.filter((g) => present.has(g));
  }, [candidates]);

  const [group, setGroup] = useState<string>(groups[0] ?? "TEAM");
  const [toUserId, setToUserId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("ORTA");
  const [deadline, setDeadline] = useState("");
  const [loyihaId, setLoyihaId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const visible = candidates.filter((c) => c.group === group);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !toUserId) {
      setMessage({ ok: false, text: t("form.required") });
      return;
    }
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        toUserId,
        priority,
        deadline: deadline || null,
        loyihaId: loyihaId ? Number(loyihaId) : null,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setMessage({ ok: false, text: t("common.error") });
      return;
    }
    setTitle("");
    setDescription("");
    setDeadline("");
    setLoyihaId("");
    setToUserId(null);
    setMessage({ ok: true, text: t("form.success") });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel p-5 xl:sticky xl:top-24">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon name="plus" className="size-4" />
        {t("form.newTask")}
      </h2>

      {/* Departments you can assign to */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGroup(g);
              setToUserId(null);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              g === group
                ? "bg-navy-900 text-white dark:bg-navy-600"
                : "border hover:bg-[var(--surface)]"
            }`}
          >
            {groupLabel(g, t)}
            <span className="ml-1.5 opacity-60">
              {candidates.filter((c) => c.group === g).length}
            </span>
          </button>
        ))}
      </div>

      {/* Executor picker */}
      <div className="scroll-thin mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
        {visible.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => setToUserId(candidate.id)}
            className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
              toUserId === candidate.id
                ? "border-navy-500 bg-navy-50 dark:bg-navy-900/40"
                : "hover:bg-[var(--surface)]"
            }`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-white dark:bg-navy-700">
              {initials(candidate.full_name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {candidate.full_name}
              </span>
              <span className="muted block truncate text-xs">
                <span className="font-mono">@{candidate.login}</span>
                {candidate.position ? ` · ${candidate.position}` : ""}
              </span>
            </span>
            {toUserId === candidate.id && (
              <Icon name="check" className="size-4 text-navy-600" />
            )}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="mt-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("form.titlePlaceholder")}
          className={FIELD}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t("form.descriptionPlaceholder")}
          className={`${FIELD} resize-y`}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="muted mb-1.5 block text-[11px] font-semibold uppercase tracking-wide">
              {t("form.priority")}
            </span>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`priority.${p}` as MessageKey)}
                </option>
              ))}
            </Select>
          </label>

          <label className="block">
            <span className="muted mb-1.5 block text-[11px] font-semibold uppercase tracking-wide">
              {t("form.deadline")}
            </span>
            <DateField
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="muted mb-1.5 block text-[11px] font-semibold uppercase tracking-wide">
              {t("form.project")}
            </span>
            <Select
              value={loyihaId}
              onChange={(e) => setLoyihaId(e.target.value)}
            >
              <option value="">{t("form.noProject")}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} — {project.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      {message && (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${
            message.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60 dark:bg-navy-600 dark:hover:bg-navy-500"
      >
        {busy ? t("common.loading") : t("action.create")}
      </button>
    </form>
  );
}

export function SentTasks({ tasks }: { tasks: TaskRow[] }) {
  const t = useT();
  const [status, setStatus] = useState<string>("ALL");

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: tasks.length };
    for (const task of tasks) map[task.status] = (map[task.status] ?? 0) + 1;
    return map;
  }, [tasks]);

  const filtered =
    status === "ALL" ? tasks : tasks.filter((task) => task.status === status);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setStatus("ALL")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            status === "ALL"
              ? "bg-navy-900 text-white dark:bg-navy-600"
              : "border hover:bg-[var(--surface)]"
          }`}
        >
          {t("common.all")} {counts.ALL}
        </button>
        {TASK_STATUSES.filter((s) => counts[s]).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)}>
            <Badge
              className={`${statusTone(s)} ${
                status === s ? "ring-2" : ""
              } cursor-pointer px-3 py-1.5`}
            >
              {t(`status.${s}` as MessageKey)} {counts[s]}
            </Badge>
          </button>
        ))}
      </div>
      <TaskList
        tasks={filtered}
        variant="sent"
        emptyText={t("tasks.empty.assign")}
      />
    </div>
  );
}

export function PriorityLegend() {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRIORITIES.map((p) => (
        <Badge key={p} className={priorityTone(p)}>
          {t(`priority.${p}` as MessageKey)}
        </Badge>
      ))}
    </div>
  );
}
