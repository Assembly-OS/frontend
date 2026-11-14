"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Badge, Button, FIELD, Panel, Select } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import { PHASES, type Phase } from "@/lib/project-passport";
import { OUTCOMES, type Outcome } from "@/lib/signal-rules";
import type { Decision } from "@/lib/project-decisions";
import { formatDate, formatDateTime } from "@/lib/format";
import { INCOMPLETE_TONE, NEUTRAL_TONE } from "@/lib/types";

/**
 * The decision point (TZ 8.3) on the project's card: where it stands,
 * when the next decision and review are due, the three outcomes — and
 * below, every decision taken. The phase cannot move any other way.
 */
export function DecisionPanel({
  projectId,
  phase,
  nextDecisionOn,
  reviewDue,
  decisions,
  canDecide,
}: {
  projectId: number;
  phase: Phase | null;
  nextDecisionOn: string | null;
  reviewDue: string;
  decisions: Decision[];
  canDecide: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome>("CONTINUE");
  const [phaseTo, setPhaseTo] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const today = new Date().toISOString().slice(0, 10);
  const decisionOverdue = Boolean(nextDecisionOn && nextDecisionOn < today);
  const reviewOverdue = reviewDue < today;

  async function send(body: Record<string, unknown>) {
    setState("busy");
    try {
      const response = await fetch(`/api/projects/${projectId}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("decide");
      setNote("");
      setPhaseTo("");
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <Panel title={t("decision.title")}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4">
        <div className="min-w-0">
          <dt className="muted text-[11px]">{t("decision.nextOn")}</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-sm tabular-nums">
            {nextDecisionOn ? formatDate(nextDecisionOn) : "—"}
            {decisionOverdue && <Badge className={INCOMPLETE_TONE}>{t("decision.overdue")}</Badge>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="muted text-[11px]">{t("decision.reviewDue")}</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-sm tabular-nums">
            {formatDate(reviewDue)}
            {reviewOverdue && <Badge className={INCOMPLETE_TONE}>{t("decision.overdue")}</Badge>}
          </dd>
        </div>
      </dl>

      {canDecide && (
        <form
          className="space-y-3 border-t px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send({ outcome, note: note.trim() || null, phase_to: phaseTo || null });
          }}
        >
          <p className="muted text-xs">{t("decision.hint")}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {OUTCOMES.map((value) => (
              <label
                key={value}
                className={`flex min-h-10 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm transition duration-150 ${
                  outcome === value ? "border-navy-500 bg-[var(--surface)]" : "hover:bg-[var(--surface)]"
                }`}
              >
                <input type="radio" name="outcome" value={value} checked={outcome === value} onChange={() => setOutcome(value)} className="mt-1" />
                <span className="min-w-0">
                  <span className="block font-medium">{t(`decision.outcome.${value}` as MessageKey)}</span>
                  <span className="muted block text-[11px]">{t(`decision.outcome.hint.${value}` as MessageKey)}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <label className="block">
              <span className="muted mb-1 block text-xs font-medium">{t("decision.phaseTo")}</span>
              <Select value={phaseTo} onChange={(e) => setPhaseTo(e.target.value)}>
                <option value="">{t("decision.default")}</option>
                {PHASES.map((value) => (
                  <option key={value} value={value}>
                    {t(`proj.phase.${value}` as MessageKey)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="muted mb-1 block text-xs font-medium">{t("decision.note")}</span>
              <input className={FIELD} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={state === "busy"}>
              {t("decision.take")}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={state === "busy"} onClick={() => void send({ review: true })}>
              {t("decision.review")}
            </Button>
            {state === "error" && (
              <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                {t("common.error")}
              </p>
            )}
          </div>
        </form>
      )}

      <div className="border-t">
        <h3 className="muted px-5 pt-3 text-[11px] font-semibold uppercase tracking-wide">{t("decision.history")}</h3>
        {decisions.length === 0 ? (
          <p className="muted px-5 pb-4 pt-2 text-xs">{t("decision.empty")}</p>
        ) : (
          <ol className="divide-y">
            {decisions.map((decision) => (
              <li key={decision.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-5 py-2.5 text-xs">
                <Badge className={NEUTRAL_TONE}>{t(`decision.outcome.${decision.outcome}` as MessageKey)}</Badge>
                <span className="font-medium">
                  {decision.phase_from ? t(`proj.phase.${decision.phase_from}` as MessageKey) : "—"} →{" "}
                  {decision.phase_to ? t(`proj.phase.${decision.phase_to}` as MessageKey) : "—"}
                </span>
                {decision.note && <span className="muted min-w-0 [overflow-wrap:anywhere]">· {decision.note}</span>}
                <span className="muted ml-auto tabular-nums">
                  {decision.decided_by_name ? `${decision.decided_by_name} · ` : ""}
                  {formatDateTime(decision.decided_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      {phase === null && <p className="muted border-t px-5 py-3 text-[11px]">{t("proj.phase.CONCEPT")}: {t("decision.outcome.hint.CONTINUE")}</p>}
    </Panel>
  );
}
