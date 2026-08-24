"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { Badge, DateField, FIELD, Select } from "@/components/ui";
import { ChainRow, type ChainStage } from "@/components/chain-row";
import { TaskList } from "@/components/task-list";
import { initials } from "@/lib/format";
import {
  PRIORITIES,
  TASK_STATUSES,
  priorityTone,
  statusTone,
  type Priority,
  type TaskRow,
  TASK_SCOPES,
  type TaskScope,
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

/** Matches MAX_STAGES on the server, which is the rule that actually holds. */
const MAX_STAGES = 8;

/** Server refusals worth naming. Anything else is a generic failure. */
const CHAIN_ERROR: Record<string, MessageKey> = {
  TOO_MANY_STAGES: "chain.max",
  ADJACENT_DUPLICATE: "chain.duplicate",
  FORBIDDEN: "chain.forbidden",
  REQUIRED: "form.required",
};

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
  // Empty and off by default: handing work to one person is the common case
  // and must not cost a single extra tap, so the queue does not exist on
  // screen until somebody asks for it.
  const [chainMode, setChainMode] = useState(false);
  const [chain, setChain] = useState<ChainStage[]>([]);
  const [chainNote, setChainNote] = useState<string | null>(null);
  const nextKey = useRef(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("ORTA");
  const [scope, setScope] = useState<TaskScope>("HAFTALIK");
  const [deadline, setDeadline] = useState("");
  const [loyihaId, setLoyihaId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const visible = candidates.filter((c) => c.group === group);

  /**
   * A tap on a person either chooses them or adds them to the end of the
   * queue. Both refusals are stated on the spot rather than silently ignored:
   * a control that does nothing reads as a broken control.
   */
  function pick(candidate: Candidate) {
    if (!chainMode) {
      setToUserId(candidate.id);
      return;
    }
    setChainNote(null);
    if (chain.length >= MAX_STAGES) {
      setChainNote(t("chain.max"));
      return;
    }
    if (chain[chain.length - 1]?.userId === candidate.id) {
      setChainNote(t("chain.duplicate"));
      return;
    }
    setChain((list) => [
      ...list,
      {
        key: nextKey.current++,
        userId: candidate.id,
        name: candidate.full_name,
        instruction: "",
        reviewNext: false,
      },
    ]);
  }

  function moveStage(index: number, delta: -1 | 1) {
    setChain((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleChainMode() {
    setChainNote(null);
    setChainMode((on) => {
      if (on) setChain([]);
      // Whoever was already picked becomes the first turn, so switching mode
      // never throws away a choice the author has already made.
      else if (toUserId) {
        const chosen = candidates.find((c) => c.id === toUserId);
        if (chosen)
          setChain([
            {
              key: nextKey.current++,
              userId: chosen.id,
              name: chosen.full_name,
              instruction: "",
              reviewNext: false,
            },
          ]);
      }
      return !on;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || (chainMode ? chain.length === 0 : !toUserId)) {
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
        priority,
        scope,
        deadline: deadline || null,
        loyihaId: loyihaId ? Number(loyihaId) : null,
        // One shape or the other, never both: a chain of one is what a plain
        // assignment already is on the server.
        ...(chainMode && chain.length > 0
          ? {
              stages: chain.map((stage) => ({
                toUserId: stage.userId,
                instruction: stage.instruction.trim() || null,
                reviewNext: stage.reviewNext,
              })),
            }
          : { toUserId }),
      }),
    });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      const key = data.error ? CHAIN_ERROR[data.error] : undefined;
      setMessage({ ok: false, text: key ? t(key) : t("common.error") });
      return;
    }
    setTitle("");
    setDescription("");
    setDeadline("");
    setLoyihaId("");
    setScope("HAFTALIK");
    setToUserId(null);
    setChain([]);
    setChainMode(false);
    setChainNote(null);
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

      {/* One assignment can pass through several people in turn. Off by
          default — the toggle is the only thing this feature adds to the
          screen until somebody switches it on. */}
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition duration-150 hover:bg-[var(--surface)]">
        <input
          type="checkbox"
          checked={chainMode}
          onChange={toggleChainMode}
          className="mt-0.5 size-4 shrink-0 accent-navy-700"
        />
        <span className="min-w-0">
          <span className="block text-xs font-semibold leading-snug">
            {t("chain.enable")}
          </span>
          <span className="muted block text-[11px] leading-snug">
            {t("chain.hint")}
          </span>
        </span>
      </label>

      {/* Executor picker */}
      <div className="scroll-thin mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
        {visible.map((candidate) => {
          // In chain mode a person can hold more than one turn (A → B → A is
          // an ordinary rework loop), so the marker is every position they
          // occupy, not a tick.
          const spots = chain
            .map((stage, index) => (stage.userId === candidate.id ? index + 1 : 0))
            .filter(Boolean);
          const chosen = chainMode ? spots.length > 0 : toUserId === candidate.id;
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => pick(candidate)}
              className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                chosen
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
              {chainMode
                ? spots.length > 0 && (
                    <span className="shrink-0 rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white dark:bg-navy-600">
                      {spots.join(", ")}
                    </span>
                  )
                : chosen && (
                    <Icon name="check" className="size-4 text-navy-600" />
                  )}
            </button>
          );
        })}
      </div>

      {chainMode && (
        <div className="mt-3">
          {chain.length === 0 ? (
            <p className="muted rounded-xl border border-dashed px-3 py-2.5 text-xs">
              {t("chain.add")}
            </p>
          ) : (
            <>
              <p className="muted mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
                {t("chain.title")}
              </p>
              <ol className="space-y-2">
                {chain.map((stage, index) => (
                  <ChainRow
                    key={stage.key}
                    stage={stage}
                    index={index}
                    isLast={index === chain.length - 1}
                    onChange={(patch) =>
                      setChain((list) =>
                        list.map((item) =>
                          item.key === stage.key ? { ...item, ...patch } : item,
                        ),
                      )
                    }
                    onMove={(delta) => moveStage(index, delta)}
                    onRemove={() =>
                      setChain((list) =>
                        list.filter((item) => item.key !== stage.key),
                      )
                    }
                  />
                ))}
              </ol>
              {/* The order in one line, because the order is the feature. */}
              <p className="mt-2 text-xs leading-relaxed">
                {chain.map((stage) => stage.name).join(" → ")}
                {/* "Bosqich: 3", not "3 bosqich" — the count after the word
                    sidesteps four languages worth of plural agreement. */}
                <span className="muted ml-1.5">
                  · {t("chain.stages")}:{" "}
                  <span className="tabular-nums">{chain.length}</span>
                </span>
              </p>
            </>
          )}
          {chainNote && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
              {chainNote}
            </p>
          )}
        </div>
      )}

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

        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {/* Kind before priority: it decides which list the assignment lands
              in, and priority only orders it once it is there. */}
          <label className="block">
            <span className="muted mb-1.5 block text-[11px] font-semibold uppercase tracking-wide">
              {t("form.scope")}
            </span>
            <Select
              value={scope}
              onChange={(e) => setScope(e.target.value as TaskScope)}
            >
              {TASK_SCOPES.map((value) => (
                <option key={value} value={value}>
                  {t(`scope.${value}` as MessageKey)}
                </option>
              ))}
            </Select>
          </label>

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
