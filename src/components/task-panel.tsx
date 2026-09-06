"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./i18n-provider";
import { Button } from "./ui";
import { AcceptanceTrail } from "./acceptance";
import { formatDate, formatDateTime } from "@/lib/format";
import { statusTone, type TaskStatus } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";

interface HistoryEvent {
  id: number;
  action: string;
  comment: string | null;
  created_at: string;
  actor: string;
}

/**
 * An assignment as it appears inside the journal entry that raised it.
 *
 * It answers, in one block and in this order, the question a person who hands
 * out work actually asks: what did I ask for, of whom, by when, where has it
 * got to, and — when it has got nowhere — what can I do about it.
 *
 * The current status and the acceptance trail are both here because they say
 * different things. The status is where the work is; the trail is how it got
 * there and where it stalled. "In progress" hides that the person sat on it
 * for two days; "accepted 14:36" hides that it was then returned twice.
 */
export function TaskPanel({
  taskId,
  title,
  assignee,
  deadline,
  status,
  createdAt,
  seenAt,
  acceptedAt,
  canRemind,
}: {
  taskId: number;
  title: string;
  assignee: string | null;
  deadline: string | null;
  status: string;
  createdAt: string;
  seenAt: string | null;
  acceptedAt: string | null;
  /** The author, and only while nobody has answered yet. */
  canRemind: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEvent[] | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reminded, setReminded] = useState(false);
  const [error, setError] = useState("");

  async function loadHistory() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (history) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/history`);
      if (!response.ok) throw new Error("history");
      const data = (await response.json()) as {
        events: HistoryEvent[];
        reason: string | null;
      };
      setHistory(data.events);
      setReason(data.reason);
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function remind() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${taskId}/remind`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("remind");
      setReminded(true);
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const declined = status === "RAD_ETILDI";

  return (
    <div className="mt-2 rounded-xl border px-3 py-2">
      <p className="flex flex-wrap items-center gap-2 text-xs">
        <span className="muted font-medium">{t("thread.task")}</span>
        <span className="font-medium">{title}</span>
        {assignee && <span className="muted">{assignee}</span>}
        {deadline && (
          <span className="muted tabular-nums">{formatDate(deadline)}</span>
        )}
        {/* Where the work is, next to how it got there. */}
        <span className={statusTone(status as TaskStatus)}>
          {t(`status.${status}` as MessageKey)}
        </span>
      </p>

      <div className="mt-1.5">
        <AcceptanceTrail
          createdAt={createdAt}
          seenAt={seenAt}
          acceptedAt={acceptedAt}
          status={status}
          t={t}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {/* Only while the assignment is genuinely unanswered. Once somebody
            has taken it on, a reminder stops being a reminder. */}
        {canRemind && status === "YANGI" && (
          <Button
            size="sm"
            variant="ghost"
            icon="bell"
            disabled={busy || reminded}
            onClick={() => void remind()}
          >
            {reminded ? t("task.reminded") : t("task.remind")}
          </Button>
        )}
        <Button size="sm" variant="ghost" icon="clock" onClick={() => void loadHistory()}>
          {t("tasks.history")}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      {open && (
        <div className="mt-2 border-t pt-2">
          {busy && !history ? (
            <p className="muted text-xs">{t("common.loading")}</p>
          ) : history && history.length > 0 ? (
            <>
              {/* The refusal reason sits above the log rather than buried in
                  it: it is the one line that tells the author what to do
                  next, and hunting for it defeats the point of recording it. */}
              {declined && reason && (
                <p className="mb-2 text-xs">
                  <span className="muted">{t("task.declineReason")}: </span>
                  <span className="font-medium">{reason}</span>
                </p>
              )}
              <ol className="space-y-1.5">
                {history.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="muted shrink-0 tabular-nums">
                      {formatDateTime(event.created_at)}
                    </span>
                    <span className="font-medium">
                      {t(`event.${event.action}` as MessageKey)}
                    </span>
                    <span className="muted">{event.actor}</span>
                    {event.comment && (
                      <span className="muted basis-full">{event.comment}</span>
                    )}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="muted text-xs">{t("common.noData")}</p>
          )}
        </div>
      )}
    </div>
  );
}

