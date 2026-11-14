"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "./i18n-provider";
import { Button, FIELD, Skeleton } from "./ui";
import { formatDateTime, formatNumber } from "@/lib/format";

interface Entry {
  id: number;
  author_name: string;
  did: string;
  outcome: string;
  metric: number | null;
  blocker: string | null;
  help_needed: string | null;
  created_at: string;
}

/**
 * The progress journal of an open-ended assignment, TZ block 3.2.
 *
 * Fetched when the card is opened, like the stage detail beside it: a list of
 * twenty assignments should not read twenty journals nobody expanded. The two
 * required fields are the TZ's — what was done and what it produced — and the
 * button waits for both, saying so.
 */
export function ProgressJournal({
  taskId,
  canReport,
  unit,
  initiallyWriting = false,
}: {
  taskId: number;
  canReport: boolean;
  unit: string | null;
  initiallyWriting?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const [writing, setWriting] = useState(initiallyWriting && canReport);
  const [did, setDid] = useState("");
  const [outcome, setOutcome] = useState("");
  const [metric, setMetric] = useState("");
  const [blocker, setBlocker] = useState("");
  const [help, setHelp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/tasks/${taskId}/progress`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { entries: Entry[] }) => {
        if (alive) {
          setEntries(data.entries);
          setFailed(false);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [taskId, version]);

  const complete = Boolean(did.trim() && outcome.trim());

  async function save() {
    if (!complete || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          did,
          outcome,
          metric: metric.trim() || null,
          blocker: blocker.trim() || null,
          help: help.trim() || null,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(
          t(
            data.error === "PROGRESS_REQUIRED"
              ? "progress.required"
              : data.error === "BAD_METRIC"
                ? "progress.badMetric"
                : "common.error",
          ),
        );
        return;
      }
      setDid("");
      setOutcome("");
      setMetric("");
      setBlocker("");
      setHelp("");
      setWriting(false);
      setVersion((value) => value + 1);
      // The card's "last report" line and a lifted "Jim" come from the server.
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="muted text-[11px] font-semibold uppercase tracking-wide">
          {t("progress.title")}
        </p>
        {canReport && !writing && (
          <Button size="sm" variant="secondary" icon="plus" onClick={() => setWriting(true)}>
            {t("progress.add")}
          </Button>
        )}
      </div>

      {writing && (
        <div className="mb-3 space-y-2 rounded-xl border p-3">
          <textarea
            id={`progress-did-${taskId}`}
            value={did}
            onChange={(event) => setDid(event.target.value)}
            rows={2}
            autoFocus
            placeholder={t("progress.did")}
            aria-label={t("progress.did")}
            className={`${FIELD} resize-y`}
          />
          <textarea
            id={`progress-outcome-${taskId}`}
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            rows={2}
            placeholder={t("progress.outcome")}
            aria-label={t("progress.outcome")}
            className={`${FIELD} resize-y`}
          />
          <input
            id={`progress-metric-${taskId}`}
            type="text"
            inputMode="decimal"
            value={metric}
            onChange={(event) => setMetric(event.target.value)}
            placeholder={t("progress.metric")}
            aria-label={t("progress.metric")}
            className={FIELD}
          />
          <input
            id={`progress-blocker-${taskId}`}
            type="text"
            value={blocker}
            onChange={(event) => setBlocker(event.target.value)}
            placeholder={t("progress.blocker")}
            aria-label={t("progress.blocker")}
            className={FIELD}
          />
          <input
            id={`progress-help-${taskId}`}
            type="text"
            value={help}
            onChange={(event) => setHelp(event.target.value)}
            placeholder={t("progress.help")}
            aria-label={t("progress.help")}
            className={FIELD}
          />
          {!complete && <p className="muted text-[11px]">{t("progress.required")}</p>}
          {error && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !complete} onClick={() => void save()}>
              {t("progress.save")}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setWriting(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </div>
      )}

      {entries === null && !failed && <Skeleton className="h-14 w-full" />}
      {failed && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {t("common.error")}
        </p>
      )}
      {entries && entries.length === 0 && (
        <p className="muted text-xs">{t("progress.empty")}</p>
      )}
      {entries && entries.length > 0 && (
        <ol className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-xl bg-[var(--surface)] px-3 py-2">
              <p className="muted text-[11px] tabular-nums">
                {formatDateTime(entry.created_at)} · {entry.author_name}
                {entry.metric !== null && (
                  <>
                    {" · "}
                    <span className="font-semibold text-[var(--ink)]">
                      {formatNumber(entry.metric)}
                      {unit ? ` ${unit}` : ""}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-1 whitespace-pre-line leading-relaxed">{entry.did}</p>
              <p className="mt-1 whitespace-pre-line leading-relaxed">
                <span className="muted">{t("progress.outcomeShort")}: </span>
                {entry.outcome}
              </p>
              {entry.blocker && (
                <p className="mt-1 text-xs">
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    {t("progress.blockerLabel")}:
                  </span>{" "}
                  {entry.blocker}
                </p>
              )}
              {entry.help_needed && (
                <p className="mt-1 text-xs">
                  <span className="font-semibold text-sky-700 dark:text-sky-300">
                    {t("progress.helpLabel")}:
                  </span>{" "}
                  {entry.help_needed}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
