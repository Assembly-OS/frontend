"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Badge, Button, DateField, FIELD, IconButton, PageHeader, Select } from "@/components/ui";
import { HELP_STATUSES, isLate } from "@/lib/work-schedule";
import type { MessageKey } from "@/lib/i18n";
import { HELP_TONE } from "../../tone";

export interface StageLine {
  id: number | null;
  name: string;
  plan_start: string;
  plan_end: string;
  fact_start: string;
  fact_end: string;
  progress: string;
  delay_reason: string;
  help_needed: string;
  help_status: string;
}

type Line = StageLine & { key: number };

/** Refusals that name a line, each with its own sentence. */
const ROW_ERRORS = ["NAME_REQUIRED", "PLAN_REQUIRED", "BAD_PLAN", "BAD_FACT", "DELAY_REASON"];

const EMPTY: StageLine = {
  id: null,
  name: "",
  plan_start: "",
  plan_end: "",
  fact_start: "",
  fact_end: "",
  progress: "0",
  delay_reason: "",
  help_needed: "",
  help_status: "",
};

/**
 * Editing a project's work schedule, one card per item.
 *
 * The reason for a delay is the TZ's one compulsory field here, so the form
 * says so the moment an item falls behind — as the dates are typed, against
 * the Assembly's today passed in from the server — rather than on save. The
 * server refuses the same thing and names the line; that line is outlined.
 *
 * Asking for help is open to whoever keeps the schedule. Answering it is the
 * Assembly's: only a manager sees the status as something to set; everyone
 * else sees where their request stands.
 */
export function StagesForm({
  projectId,
  projectName,
  initial,
  today,
  mayAnswer,
}: {
  projectId: number;
  projectName: string;
  initial: StageLine[];
  today: string;
  mayAnswer: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const nextKey = useRef(initial.length);
  const [lines, setLines] = useState<Line[]>(() =>
    (initial.length ? initial : [EMPTY]).map((line, key) => ({ ...line, key })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; row: number | null } | null>(null);

  const patch = (key: number, change: Partial<StageLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)));
  const add = () => {
    nextKey.current += 1;
    setLines((current) => [...current, { ...EMPTY, key: nextKey.current }]);
  };
  const remove = (key: number) => setLines((current) => current.filter((line) => line.key !== key));

  const behind = (line: StageLine) =>
    Boolean(line.plan_end) &&
    isLate(
      {
        plan_start: line.plan_start,
        plan_end: line.plan_end,
        fact_start: line.fact_start || null,
        fact_end: line.fact_end || null,
        progress: line.fact_end ? 100 : Number(line.progress) || 0,
      },
      today,
    );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: lines.map((line) => ({
            id: line.id,
            name: line.name,
            plan_start: line.plan_start,
            plan_end: line.plan_end,
            fact_start: line.fact_start,
            fact_end: line.fact_end,
            progress: Number(line.progress) || 0,
            delay_reason: line.delay_reason,
            help_needed: line.help_needed,
            help_status: line.help_status || null,
          })),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; row?: number };
      if (!response.ok) {
        const known = ROW_ERRORS.includes(data.error ?? "");
        setError({
          text: known
            ? t(`sched.err.${data.error}` as MessageKey).replace("{n}", String(data.row ?? ""))
            : t("common.error"),
          row: data.row ?? null,
        });
        return;
      }
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch {
      setError({ text: t("common.error"), row: null });
    } finally {
      setBusy(false);
    }
  }

  const label = (text: string, control: React.ReactNode, hint?: React.ReactNode) => (
    <label className="block min-w-0">
      <span className="muted mb-1 block text-xs font-medium">{text}</span>
      {control}
      {hint}
    </label>
  );

  return (
    <form onSubmit={submit} className="max-w-5xl">
      <PageHeader
        title={t("sched.title")}
        description={projectName}
        action={
          <div className="flex flex-wrap gap-2">
            <Button href={`/projects/${projectId}`} variant="secondary">
              {t("action.cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {t("common.save")}
            </Button>
          </div>
        }
      />

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300"
        >
          {error.text}
        </p>
      )}

      <ol className="space-y-4">
        {lines.map((line, index) => {
          const late = behind(line);
          const flagged = error?.row === index + 1;
          return (
            <li
              key={line.key}
              className={`panel space-y-3 p-4 lg:p-5 ${flagged ? "ring-2 ring-rose-500/40" : ""}`}
            >
              <div className="flex items-end gap-3">
                <span className="muted pb-2.5 text-sm tabular-nums">{index + 1}.</span>
                <div className="min-w-0 flex-1">
                  {label(
                    `${t("sched.name")} *`,
                    <input
                      value={line.name}
                      onChange={(e) => patch(line.key, { name: e.target.value })}
                      className={FIELD}
                    />,
                  )}
                </div>
                <IconButton
                  icon="trash"
                  label={`${t("sched.removeItem")} ${index + 1}`}
                  onClick={() => remove(line.key)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {label(
                  `${t("sched.planStart")} *`,
                  <DateField value={line.plan_start} onChange={(e) => patch(line.key, { plan_start: e.target.value })} />,
                )}
                {label(
                  `${t("sched.planEnd")} *`,
                  <DateField value={line.plan_end} onChange={(e) => patch(line.key, { plan_end: e.target.value })} />,
                )}
                {label(
                  t("sched.factStart"),
                  <DateField value={line.fact_start} onChange={(e) => patch(line.key, { fact_start: e.target.value })} />,
                )}
                {label(
                  t("sched.factEnd"),
                  <DateField value={line.fact_end} onChange={(e) => patch(line.key, { fact_end: e.target.value })} />,
                )}
                {label(
                  t("sched.progress"),
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    inputMode="numeric"
                    // An actual end means it is finished; the server records
                    // a hundred, and the field says so rather than disagreeing.
                    value={line.fact_end ? "100" : line.progress}
                    disabled={Boolean(line.fact_end)}
                    onChange={(e) => patch(line.key, { progress: e.target.value })}
                    className={`${FIELD} tabular-nums disabled:opacity-60`}
                  />,
                )}
              </div>

              {label(
                late ? `${t("sched.delayReason")} *` : t("sched.delayReason"),
                <textarea
                  rows={2}
                  value={line.delay_reason}
                  onChange={(e) => patch(line.key, { delay_reason: e.target.value })}
                  aria-invalid={late && !line.delay_reason.trim() ? true : undefined}
                  className={`${FIELD} resize-y ${
                    late && !line.delay_reason.trim() ? "border-amber-500" : ""
                  }`}
                />,
                late ? (
                  <span className="mt-1 block text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    {t("sched.delayRequired")}
                  </span>
                ) : undefined,
              )}

              {/* A second column only when there is a status to put in it; kept
                  empty, it narrowed the help box on every item that asked for
                  nothing. */}
              <div
                className={`grid grid-cols-[minmax(0,1fr)] gap-3 ${
                  line.help_needed.trim() && (mayAnswer || line.help_status)
                    ? "sm:grid-cols-[minmax(0,1fr)_12rem]"
                    : ""
                }`}
              >
                {label(
                  t("sched.helpNeeded"),
                  <textarea
                    rows={2}
                    value={line.help_needed}
                    onChange={(e) => patch(line.key, { help_needed: e.target.value })}
                    className={`${FIELD} resize-y`}
                  />,
                  <span className="muted mt-1 block text-[11px]">{t("sched.helpNote")}</span>,
                )}
                {line.help_needed.trim() &&
                  (mayAnswer
                    ? label(
                        t("sched.helpStatus"),
                        <Select
                          value={line.help_status}
                          onChange={(e) => patch(line.key, { help_status: e.target.value })}
                        >
                          <option value="">—</option>
                          {HELP_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {t(`sched.help.${status}` as MessageKey)}
                            </option>
                          ))}
                        </Select>,
                      )
                    : line.help_status && (
                        <div>
                          <span className="muted mb-1 block text-xs font-medium">
                            {t("sched.helpStatus")}
                          </span>
                          <Badge className={HELP_TONE[line.help_status]}>
                            {t(`sched.help.${line.help_status}` as MessageKey)}
                          </Badge>
                        </div>
                      ))}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4">
        <Button type="button" variant="secondary" icon="plus" onClick={add}>
          {t("sched.addItem")}
        </Button>
      </div>
    </form>
  );
}
