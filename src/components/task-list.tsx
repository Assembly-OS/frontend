"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "./i18n-provider";
import { Badge, Button, EmptyState } from "./ui";
import { Icon } from "./icons";
import { daysUntil, formatDate, formatDateTime } from "@/lib/format";
import {
  priorityTone,
  statusTone,
  type Priority,
  type TaskRow,
} from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";

export type TaskVariant = "inbox" | "execute" | "review" | "sent" | "overdue";

/** Past its deadline and still in play — a closed task is never "late". */
function isOverdue(task: TaskRow): boolean {
  const left = daysUntil(task.deadline);
  return (
    left !== null &&
    left < 0 &&
    task.status !== "BAJARILDI" &&
    task.status !== "RAD_ETILDI"
  );
}

type Action = "accept" | "reject" | "start" | "submit" | "approve" | "return";

/** Actions that open a comment box before they fire. */
const NEEDS_COMMENT: Action[] = ["submit", "return", "reject"];

function actionsFor(variant: TaskVariant, status: string): Action[] {
  if (variant === "inbox") return status === "YANGI" ? ["accept", "reject"] : [];
  if (variant === "execute") {
    if (status === "QABUL_QILINDI" || status === "QAYTARILDI")
      return ["start", "submit"];
    if (status === "BAJARILMOQDA") return ["submit"];
    return [];
  }
  if (variant === "review")
    return status === "TEKSHIRUVDA" ? ["approve", "return"] : [];
  // A late task can be sitting at any stage, so offer whatever moves it on.
  if (variant === "overdue") {
    if (status === "YANGI") return ["accept", "reject"];
    if (status === "QABUL_QILINDI" || status === "QAYTARILDI")
      return ["start", "submit"];
    if (status === "BAJARILMOQDA") return ["submit"];
    return [];
  }
  return [];
}

const ACTION_LABEL: Record<Action, MessageKey> = {
  accept: "action.accept",
  reject: "action.reject",
  start: "action.start",
  submit: "action.submit",
  approve: "action.approve",
  return: "action.return",
};

const ACTION_STYLE: Record<Action, string> = {
  accept: "bg-navy-900 text-white hover:bg-navy-800 dark:bg-navy-600 dark:hover:bg-navy-500",
  reject: "border hover:bg-[var(--surface)]",
  start: "border hover:bg-[var(--surface)]",
  submit: "bg-navy-900 text-white hover:bg-navy-800 dark:bg-navy-600 dark:hover:bg-navy-500",
  approve: "bg-emerald-600 text-white hover:bg-emerald-700",
  return: "border hover:bg-[var(--surface)]",
};

/**
 * Withdrawing a task you sent by mistake. Offered only where it is honest: on
 * the list of what you sent, while the assignee has not touched it yet. Once
 * they accept, the task is part of their record and the right move is to close
 * it with a comment.
 */
function canWithdraw(variant: TaskVariant, status: string): boolean {
  return variant === "sent" && status === "YANGI";
}

function TaskCard({
  task,
  variant,
}: {
  task: TaskRow;
  variant: TaskVariant;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = actionsFor(variant, task.status);
  const left = daysUntil(task.deadline);
  const overdue = isOverdue(task);
  // Two presses, not a modal: the second press is the confirmation, and it
  // says what it will do rather than asking "are you sure?".
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function withdraw() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/tasks/${task.id}/delete`, {
      method: "POST",
    });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(
        data.error === "ALREADY_STARTED"
          ? t("tasks.deleteTooLate")
          : t("common.error"),
      );
      setConfirmDelete(false);
      return;
    }
    router.refresh();
  }

  async function fire(action: Action, withComment: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment: withComment }),
    });
    setBusy(false);
    if (!response.ok) {
      setError(t("common.error"));
      return;
    }
    setPendingAction(null);
    setComment("");
    router.refresh();
  }

  function onAction(action: Action) {
    if (NEEDS_COMMENT.includes(action)) {
      setPendingAction(action);
      setOpen(true);
      return;
    }
    void fire(action, "");
  }

  const counterpart =
    variant === "inbox" || variant === "execute" || variant === "overdue"
      ? { label: t("tasks.from"), name: task.from_name, login: task.from_login }
      : { label: t("tasks.to"), name: task.to_name, login: task.to_login };

  return (
    <article className="panel animate-rise p-4 lg:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="muted font-mono text-[11px] font-semibold">
              {task.code}
            </span>
            <Badge className={statusTone(task.status)}>
              {t(`status.${task.status}` as MessageKey)}
            </Badge>
            <Badge className={priorityTone(task.priority)}>
              {t(`priority.${task.priority}` as MessageKey)}
            </Badge>
            {overdue && (
              <Badge className="bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30">
                <Icon name="alert" className="mr-1 size-3" />
                {t("tasks.overdue")}
              </Badge>
            )}
          </div>

          <h3 className="mt-2 text-[15px] font-semibold leading-snug">
            {task.title}
          </h3>

          {/* Sits in the collapsed card, not behind "details": this is the one
              thing the executor has to read before touching the task again. */}
          {task.return_comment && (
            <div className="mt-2 rounded-xl border-l-2 border-orange-500 bg-orange-50 px-3 py-2 dark:bg-orange-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
                <Icon name="alert" className="mr-1 inline size-3" />
                {t("tasks.returnReason")}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
                {task.return_comment}
              </p>
            </div>
          )}

          <div className="muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span>
              {counterpart.label}:{" "}
              <span className="font-medium">{counterpart.name}</span>{" "}
              <span className="font-mono">@{counterpart.login}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="size-3.5" />
              {task.deadline ? formatDate(task.deadline) : t("tasks.noDeadline")}
              {left !== null && left >= 0 && task.status !== "BAJARILDI" && (
                <span className="ml-1">
                  ({left} {t("tasks.daysLeft")})
                </span>
              )}
            </span>
            {task.loyiha_name && (
              <span className="truncate">
                {t("tasks.project")}: {task.loyiha_name}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="muted rounded-lg border px-2.5 py-1.5 text-xs font-medium transition hover:bg-[var(--surface)]"
        >
          {t("action.details")}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t pt-4 text-sm">
          {task.description && (
            <div>
              <p className="muted mb-1 text-[11px] font-semibold uppercase tracking-wide">
                {t("tasks.description")}
              </p>
              <p className="leading-relaxed">{task.description}</p>
            </div>
          )}
          {task.result_comment && (
            <div>
              <p className="muted mb-1 text-[11px] font-semibold uppercase tracking-wide">
                {t("tasks.result")}
              </p>
              <p className="rounded-xl bg-[var(--surface)] px-3 py-2 leading-relaxed">
                {task.result_comment}
              </p>
            </div>
          )}
          <p className="muted text-xs">
            {t("tasks.created")}: {formatDateTime(task.created_at)}
            {task.submitted_at
              ? ` · ${t("action.submit")}: ${formatDateTime(task.submitted_at)}`
              : ""}
          </p>
        </div>
      )}

      {pendingAction && (
        <div className="mt-4 space-y-2 border-t pt-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            autoFocus
            placeholder={
              pendingAction === "submit"
                ? t("form.resultPlaceholder")
                : t("form.commentPlaceholder")
            }
            className="w-full rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-navy-500"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void fire(pendingAction, comment)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition disabled:opacity-60 ${ACTION_STYLE[pendingAction]}`}
            >
              {t(ACTION_LABEL[pendingAction])}
            </button>
            <button
              type="button"
              onClick={() => setPendingAction(null)}
              className="rounded-xl border px-3.5 py-2 text-xs font-medium transition hover:bg-[var(--surface)]"
            >
              {t("action.cancel")}
            </button>
          </div>
        </div>
      )}

      {!pendingAction && (actions.length > 0 || canWithdraw(variant, task.status)) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              disabled={busy}
              onClick={() => onAction(action)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition disabled:opacity-60 ${ACTION_STYLE[action]}`}
            >
              {t(ACTION_LABEL[action])}
            </button>
          ))}

          {canWithdraw(variant, task.status) &&
            (confirmDelete ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void withdraw()}
                  className="ml-auto rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
                >
                  {t("tasks.deleteConfirm")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                  className="muted rounded-xl border px-3.5 py-2 text-xs font-medium transition disabled:opacity-60"
                >
                  {t("ai.cancelEdit")}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="muted ml-auto inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition hover:border-rose-500/50 hover:text-rose-600 disabled:opacity-60 dark:hover:text-rose-400"
              >
                <Icon name="trash" className="size-3.5" />
                {t("tasks.delete")}
              </button>
            ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Filter bar                                                          */
/* ------------------------------------------------------------------ */

type Filter = "ALL" | "OVERDUE" | Priority;

/**
 * Lateness first, then priority from loudest to quietest — the order someone
 * scanning a backlog actually wants to triage in.
 */
const FILTERS: { key: Filter; label: MessageKey }[] = [
  { key: "ALL", label: "tasks.filter.all" },
  { key: "OVERDUE", label: "tasks.overdue" },
  { key: "KRITIK", label: "priority.KRITIK" },
  { key: "YUQORI", label: "priority.YUQORI" },
  { key: "ORTA", label: "priority.ORTA" },
  { key: "PAST", label: "priority.PAST" },
];

/** Rows rendered before the "show more" button appears. */
const PAGE = 12;

function matches(task: TaskRow, filter: Filter): boolean {
  if (filter === "ALL") return true;
  if (filter === "OVERDUE") return isOverdue(task);
  return task.priority === filter;
}

export function TaskList({
  tasks,
  variant,
  emptyText,
  filterable = true,
}: {
  tasks: TaskRow[];
  variant: TaskVariant;
  emptyText: string;
  /** Off where the page itself is already one filtered slice (e.g. overdue). */
  filterable?: boolean;
}) {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("ALL");
  // An uncapped list turned the assign page into a 14,000-pixel scroll on a
  // phone. Show a screenful, then let the reader ask for more.
  const [shown, setShown] = useState(PAGE);

  if (tasks.length === 0) return <EmptyState text={emptyText} />;

  const visible = tasks.filter((task) => matches(task, filter));
  const page = visible.slice(0, shown);

  return (
    <div className="space-y-3">
      {filterable && (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => {
            const count = tasks.filter((task) => matches(task, key)).length;
            const active = key === filter;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                // An empty bucket stays visible (its zero is information) but
                // is not a dead end you can click into.
                disabled={count === 0 && !active}
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? "bg-navy-900 text-white dark:bg-navy-600"
                    : "panel hover:bg-[var(--surface)]"
                }`}
              >
                {t(label)}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    active ? "bg-white/20" : "bg-[var(--surface)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState text={t("tasks.filter.empty")} />
      ) : (
        <>
          {page.map((task) => (
            <TaskCard key={task.id} task={task} variant={variant} />
          ))}
          {visible.length > page.length && (
            <Button
              variant="secondary"
              block
              onClick={() => setShown((count) => count + PAGE)}
            >
              {t("tasks.showMore")} · {visible.length - page.length}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
