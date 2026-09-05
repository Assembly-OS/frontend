import { Icon } from "./icons";
import type { Translator } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";

/**
 * What has happened to an assignment, from the sender's side.
 *
 * The three moments are shown as one progression rather than three badges,
 * because that is what they are: sent, opened, accepted. Read left to right
 * it answers the only question a person who handed out work actually has —
 * how far did this get, and where did it stop.
 *
 * The stop is the point. A step nobody has reached is drawn hollow and
 * unlabelled, so "sent two days ago, never opened" and "opened within the
 * minute, still not accepted" look nothing alike at a glance. Those are
 * different conversations to have with the person.
 */
export function AcceptanceTrail({
  createdAt,
  seenAt,
  acceptedAt,
  status,
  t,
}: {
  createdAt: string;
  seenAt: string | null;
  acceptedAt: string | null;
  status: string;
  t: Translator;
}) {
  // A refusal ends the trail: there is no "accepted" left to wait for, and an
  // empty third step would read as still pending.
  const declined = status === "RAD_ETILDI";

  const steps: {
    label: string;
    at: string | null;
    tone: "done" | "wait" | "no";
  }[] = [
    { label: t("accept.sent"), at: createdAt, tone: "done" },
    {
      label: seenAt ? t("accept.seen") : t("accept.notSeen"),
      at: seenAt,
      tone: seenAt ? "done" : "wait",
    },
    declined
      ? { label: t("accept.declined"), at: null, tone: "no" }
      : {
          label: acceptedAt ? t("accept.accepted") : t("accept.notAccepted"),
          at: acceptedAt,
          tone: acceptedAt ? "done" : "wait",
        },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-2">
          {index > 0 && (
            <span aria-hidden className="h-px w-4 bg-[var(--line)]" />
          )}
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={
                step.tone === "done"
                  ? "size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                  : step.tone === "no"
                    ? "size-1.5 rounded-full bg-rose-600 dark:bg-rose-400"
                    : "size-1.5 rounded-full border border-[var(--line)]"
              }
            />
            <span
              className={`text-[11px] ${
                step.tone === "wait"
                  ? "muted"
                  : step.tone === "no"
                    ? "font-medium text-rose-700 dark:text-rose-300"
                    : "font-medium"
              }`}
            >
              {step.label}
              {step.at && (
                <span className="muted ml-1 tabular-nums">
                  {formatDateTime(step.at)}
                </span>
              )}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The one-line version for a list: who is sitting on it, and how far it got.
 *
 * Used where the full trail would not fit — the project overview's "nobody
 * has accepted these" block, which is a list of names and titles and has to
 * stay scannable at 360px.
 */
export function WaitingRow({
  title,
  assignee,
  seen,
  t,
}: {
  title: string;
  assignee: string;
  seen: boolean;
  t: Translator;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <p className="min-w-0 flex-1 truncate text-sm">{title}</p>
      <p className="muted flex shrink-0 items-center gap-1.5 text-xs">
        <Icon name={seen ? "eye" : "clock"} className="size-3.5 shrink-0" />
        <span>{assignee}</span>
        <span aria-hidden>·</span>
        <span>{seen ? t("accept.seenNotAccepted") : t("accept.notSeenYet")}</span>
      </p>
    </div>
  );
}
