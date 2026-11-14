"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Badge, Button, FIELD, Panel, Select } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import { STAGES, type Stage } from "@/lib/crm-stages";
import type { StageMove } from "@/lib/crm";
import { formatDateTime } from "@/lib/format";
import { PATH_TONE, STUCK_TONE } from "../tone";

/**
 * The partnership path on the company's card (TZ 6.2): the nine stages as
 * a row with the current one marked, how long it has been current, the
 * control to move it by hand, and beneath that every move that was made —
 * by whom, why, when. A recorded event (a meeting, a signed agreement)
 * moves the company on its own and shows up here with its reason.
 */
export function StagePanel({
  companyId,
  stage,
  days,
  limit,
  history,
  writable,
}: {
  companyId: number;
  stage: Stage;
  days: number | null;
  limit: number;
  history: StageMove[];
  writable: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Stage>(stage);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const stuck = limit > 0 && days !== null && days > limit;
  const rank = STAGES.indexOf(stage);

  async function move() {
    if (target === stage) return;
    setState("busy");
    try {
      const response = await fetch(`/api/crm/companies/${companyId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: target, note: note.trim() || null }),
      });
      if (!response.ok) throw new Error("move");
      setOpen(false);
      setNote("");
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <Panel
      title={t("crm.path")}
      action={
        writable ? (
          <Button size="sm" variant="secondary" onClick={() => setOpen((value) => !value)}>
            {t("crm.moveStage")}
          </Button>
        ) : undefined
      }
    >
      {/* The row of stages. Done ones are filled, the current one is named,
          the rest wait. Scrolls inside itself on a phone. */}
      <div className="scroll-thin overflow-x-auto px-5 pt-4">
        <ol className="flex min-w-[560px] items-start gap-1">
          {STAGES.map((item, index) => {
            const done = index < rank;
            const current = index === rank;
            return (
              <li key={item} className="min-w-0 flex-1" aria-current={current ? "step" : undefined}>
                <div
                  className={`h-1.5 rounded-full ${
                    current ? (stuck ? "bg-rose-500" : "bg-navy-700 dark:bg-navy-400") : done ? "bg-navy-300 dark:bg-navy-700" : "bg-[var(--line)]"
                  }`}
                />
                <p
                  className={`mt-1.5 text-[11px] leading-tight ${
                    current ? "font-semibold" : "muted"
                  }`}
                  title={t(`crm.stage.how.${item}` as MessageKey)}
                >
                  {t(`crm.stage.${item}` as MessageKey)}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4">
        <Badge className={stuck ? STUCK_TONE : PATH_TONE[stage] ?? PATH_TONE.NEW_CONTACT}>
          {t(`crm.stage.${stage}` as MessageKey)}
        </Badge>
        <span className="muted text-xs">{t(`crm.stage.how.${stage}` as MessageKey)}</span>
        {days !== null && (
          <span className={`text-xs tabular-nums ${stuck ? "font-semibold text-rose-700 dark:text-rose-300" : "muted"}`}>
            {days} {t("crm.daysInStage")}
            {limit > 0 ? ` · ${t("crm.limitDays")} ${limit}` : ""}
            {stuck ? ` · ${t("crm.stuck")}` : ""}
          </span>
        )}
      </div>

      {open && writable && (
        <form
          className="grid gap-3 border-t px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void move();
          }}
        >
          <label className="block">
            <span className="muted mb-1 block text-xs font-medium">{t("crm.field.stage")}</span>
            <Select value={target} onChange={(e) => setTarget(e.target.value as Stage)}>
              {STAGES.map((item, index) => (
                <option key={item} value={item}>
                  {index + 1}. {t(`crm.stage.${item}` as MessageKey)}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="muted mb-1 block text-xs font-medium">{t("crm.moveStageNote")}</span>
            <input className={FIELD} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Button type="submit" disabled={state === "busy" || target === stage}>
            {state === "busy" ? t("common.loading") : t("crm.moveStageSave")}
          </Button>
          {state === "error" && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 sm:col-span-3">
              {t("common.error")}
            </p>
          )}
        </form>
      )}

      <div className="border-t">
        <h3 className="muted px-5 pt-3 text-[11px] font-semibold uppercase tracking-wide">
          {t("crm.stageHistory")}
        </h3>
        {history.length === 0 ? (
          <p className="muted px-5 pb-4 pt-2 text-xs">{t("crm.stageHistory.empty")}</p>
        ) : (
          <ol className="divide-y">
            {history.map((move) => (
              <li key={move.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-5 py-2.5 text-xs">
                <span className="font-medium">
                  {move.from_stage ? t(`crm.stage.${move.from_stage}` as MessageKey) : "—"} →{" "}
                  {t(`crm.stage.${move.to_stage}` as MessageKey)}
                </span>
                <span className="muted">{t(`crm.stageReason.${move.reason}` as MessageKey)}</span>
                {move.note && <span className="muted min-w-0 [overflow-wrap:anywhere]">· {move.note}</span>}
                <span className="muted ml-auto tabular-nums">
                  {move.changed_by_name ? `${move.changed_by_name} · ` : ""}
                  {formatDateTime(move.changed_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  );
}
