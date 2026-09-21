import type { MessageKey, Translator } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/format";
import { daysLate, stageView, type StageRow } from "@/lib/project-stages";
import { Badge, Button, EmptyState, Panel, ProgressBar, TableWrap, Td, Th } from "@/components/ui";
import { HELP_TONE, STAGE_TONE } from "../tone";

/**
 * A project's work schedule, block 1.4 of the rebuild TZ: plan and fact side
 * by side, which is the whole of the TZ's acceptance line for it.
 *
 * A table from `sm` up, because the comparison it exists for runs across a row
 * — planned end against actual end — and a column of each is how the eye
 * compares. Below `sm` each item is a card with the same facts stacked, since
 * a five-column table at 360px is a horizontal scroll with one column showing.
 *
 * The reason for a delay and any request for help sit under the item's name,
 * where they are read with it, not in columns of their own that would be empty
 * on most rows.
 */
export function Schedule({
  projectId,
  stages,
  today,
  mayEdit,
  t,
}: {
  projectId: number;
  stages: StageRow[];
  today: string;
  mayEdit: boolean;
  t: Translator;
}) {
  const editLink = mayEdit ? (
    <a href={`/projects/${projectId}/stages`} className="muted text-xs font-medium hover:underline">
      {t("sched.edit")}
    </a>
  ) : undefined;

  if (stages.length === 0) {
    return (
      <Panel title={t("sched.title")} action={editLink}>
        <EmptyState
          bare
          icon="calendar"
          text={t("sched.empty")}
          hint={t("sched.emptyHint")}
          action={
            mayEdit ? (
              <Button href={`/projects/${projectId}/stages`} variant="secondary" size="sm" icon="plus">
                {t("sched.addItem")}
              </Button>
            ) : undefined
          }
        />
      </Panel>
    );
  }

  const latest = [...stages]
    .filter((stage) => stage.updated_at)
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))[0];

  const range = (start: string | null, end: string | null) =>
    start || end ? `${start ? formatDate(start) : "…"} – ${end ? formatDate(end) : "…"}` : "—";

  const state = (stage: StageRow) => {
    const view = stageView(stage, today);
    const late = daysLate(stage, today);
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <Badge className={STAGE_TONE[view]}>{t(`sched.view.${view}` as MessageKey)}</Badge>
        {late > 0 && (
          <span className="text-xs font-medium tabular-nums text-rose-700 dark:text-rose-300">
            {t("sched.daysLate").replace("{n}", String(late))}
          </span>
        )}
      </span>
    );
  };

  const notes = (stage: StageRow) => (
    <>
      {stage.delay_reason && (
        <p className="mt-1 text-xs">
          <span className="muted font-medium">{t("sched.delayReason")}:</span> {stage.delay_reason}
        </p>
      )}
      {/* Built like the delay line above it — a label, then the words — so
          the two read as a pair; where the request stands follows the text. */}
      {stage.help_needed && (
        <p className="mt-1 text-xs">
          <span className="muted font-medium">{t("sched.helpShort")}:</span> {stage.help_needed}
          {stage.help_status && (
            <Badge className={`${HELP_TONE[stage.help_status]} ml-1.5 align-middle`}>
              {t(`sched.help.${stage.help_status}` as MessageKey)}
            </Badge>
          )}
        </p>
      )}
    </>
  );

  const progress = (stage: StageRow) => (
    <span className="flex items-center gap-2">
      <span className="w-16">
        <ProgressBar value={stage.progress} />
      </span>
      <span className="text-xs tabular-nums">{stage.progress}%</span>
    </span>
  );

  return (
    <Panel title={t("sched.title")} action={editLink}>
      {/* A card per item on a phone. */}
      <ol className="divide-y sm:hidden">
        {stages.map((stage, index) => (
          <li key={stage.id} className="space-y-2 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">
                <span className="muted tabular-nums">{index + 1}.</span> {stage.name}
              </p>
              {state(stage)}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="muted">{t("sched.col.plan")}</dt>
                <dd className="tabular-nums">{range(stage.plan_start, stage.plan_end)}</dd>
              </div>
              <div>
                <dt className="muted">{t("sched.col.fact")}</dt>
                <dd className="tabular-nums">{range(stage.fact_start, stage.fact_end)}</dd>
              </div>
            </dl>
            {progress(stage)}
            {notes(stage)}
          </li>
        ))}
      </ol>

      {/* The same items as a table from sm up. */}
      <div className="hidden sm:block">
        <TableWrap>
          <thead>
            <tr>
              <Th className="w-8">#</Th>
              <Th>{t("sched.col.item")}</Th>
              <Th>{t("sched.col.plan")}</Th>
              <Th>{t("sched.col.fact")}</Th>
              <Th>{t("sched.col.progress")}</Th>
              <Th>{t("sched.col.state")}</Th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, index) => (
              <tr key={stage.id} className="align-top">
                <Td numeric className="muted align-top">{index + 1}</Td>
                <Td className="align-top">
                  <p className="font-medium">{stage.name}</p>
                  {notes(stage)}
                </Td>
                <Td className="whitespace-nowrap align-top text-xs tabular-nums">
                  {range(stage.plan_start, stage.plan_end)}
                </Td>
                <Td className="whitespace-nowrap align-top text-xs tabular-nums">
                  {range(stage.fact_start, stage.fact_end)}
                </Td>
                <Td className="align-top">{progress(stage)}</Td>
                <Td className="align-top">{state(stage)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </div>

      {latest?.updated_at && (
        <p className="muted border-t px-4 py-2.5 text-[11px] lg:px-5">
          {t("sched.lastUpdated")
            .replace("{name}", latest.updater_name ?? "—")
            .replace("{date}", formatDateTime(latest.updated_at))}
        </p>
      )}
    </Panel>
  );
}
