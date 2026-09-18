"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { CheckList } from "@/components/check-list";
import {
  Button,
  DateField,
  FIELD,
  PageHeader,
  Panel,
  Select,
} from "@/components/ui";
import { LEGAL_STATUSES } from "@/lib/meeting-fields";
import type { MessageKey } from "@/lib/i18n";

/** What the form starts from — empty for a new meeting, the record for an edit. */
export interface MeetingFormValues {
  title: string;
  held_at: string;
  company_id: number | null;
  legal_status: string;
  uyushma_id: number | null;
  place: string;
  participants: string;
  description: string;
  agreed: string;
  open_issues: string;
  next_steps: string;
  responsible_id: number | null;
  transcript: string;
  project_ids: number[];
  staff_ids: number[];
}

type Option = { id: number; label: string; hint?: string | null };

/** Refusals the API gives a reason for, and the sentence that explains each. */
const ERRORS: Record<string, MessageKey> = {
  TITLE_REQUIRED: "form.required",
  RESPONSIBLE_FORBIDDEN: "meeting.errResponsible",
  COMPANY_NOT_FOUND: "meeting.errGone",
  UYUSHMA_NOT_FOUND: "meeting.errGone",
  FORBIDDEN: "meeting.errForbidden",
};

/**
 * Filing a meeting, or correcting one, in the shape block 1.1 of the TZ asks.
 *
 * The left column is what the meeting said, the right column is the facts
 * about it. "What was agreed" sits second on the left and carries the one
 * line of help on the form: the TZ calls it the field that gets asked years
 * later, and it is the one people are most tempted to leave for later.
 *
 * Fields the TZ requires are starred but not enforced here or on the server —
 * only the title is. A meeting missing them is saved and shown as incomplete,
 * with the missing fields named, so a note typed in the corridor is not lost
 * for want of a legal status.
 *
 * Analysis is a separate press on a new meeting rather than automatic on save:
 * a two-line note about a phone call does not need a model run.
 */
export function MeetingForm({
  mode,
  meetingId,
  initial,
  companies,
  responsibles,
  people,
  projects,
  uyushmalar,
}: {
  mode: "create" | "edit";
  meetingId?: number;
  initial: MeetingFormValues;
  companies: Option[];
  responsibles: Option[];
  people: Option[];
  projects: Option[];
  uyushmalar: Option[];
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [analyze, setAnalyze] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "");
    const ids = (key: string) => form.getAll(key).map(Number).filter(Boolean);

    if (!text("title").trim()) {
      setError(t("form.required"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        mode === "create" ? "/api/crm/meetings" : `/api/crm/meetings/${meetingId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: text("title"),
            held_at: text("held_at"),
            company_id: text("company_id") || null,
            legal_status: text("legal_status") || null,
            uyushma_id: text("uyushma_id") || null,
            place: text("place"),
            participants: text("participants"),
            description: text("description"),
            agreed: text("agreed"),
            open_issues: text("open_issues"),
            next_steps: text("next_steps"),
            responsible_id: text("responsible_id") || null,
            transcript: text("transcript"),
            lang: text("lang") || undefined,
            project_ids: ids("project_ids"),
            staff_ids: ids("staff_ids"),
            analyze: mode === "create" && analyze,
          }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        id?: number;
        task?: { code: string } | { error: string } | null;
        error?: string;
      };
      if (!response.ok || !data.id) {
        setError(t(ERRORS[data.error ?? ""] ?? "common.error"));
        return;
      }
      // The meeting is saved either way; a next step that could not become an
      // assignment is said on the meeting's own page, where it can be fixed.
      const taskFailed = data.task && "error" in data.task;
      router.push(`/meetings/${data.id}${taskFailed ? "?task=failed" : ""}`);
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const field = (text: string, control: React.ReactNode, hint?: string) => (
    <label className="block">
      <span className="muted mb-1 block text-xs font-medium">{text}</span>
      {control}
      {hint && <span className="muted mt-1 block text-[11px]">{hint}</span>}
    </label>
  );
  const area = (name: keyof MeetingFormValues, rows: number) => (
    <textarea
      name={name}
      rows={rows}
      defaultValue={String(initial[name] ?? "")}
      className={`${FIELD} resize-y`}
    />
  );

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={mode === "create" ? t("crm.newMeeting") : t("meeting.editTitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              href={mode === "create" ? "/meetings" : `/meetings/${meetingId}`}
              variant="secondary"
            >
              {t("action.cancel")}
            </Button>
            <Button
              type="submit"
              variant={mode === "create" ? "secondary" : "primary"}
              disabled={busy}
              onClick={() => setAnalyze(false)}
            >
              {t("common.save")}
            </Button>
            {mode === "create" && (
              <Button
                type="submit"
                icon="shield"
                disabled={busy}
                onClick={() => setAnalyze(true)}
              >
                {busy && analyze ? t("crm.analyzing") : t("crm.analyze")}
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {/* One column on a phone, in the order a meeting is filled in: what and
          when first — the title is the one field a save needs — then what was
          said, who was there, and the transcript last. The markup is in that
          order too, so focus and a screen reader follow what is on screen. On
          a desk the same four panels are placed by grid position alone: the
          facts on the right spanning every row, the other three stacked on the
          left. Only the right column may end early; a panel beside a taller
          one in the same row would leave a gap between panels on the left. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-3">
        <Panel title={t("meeting.facts")} className="xl:col-start-3 xl:row-span-3 xl:row-start-1">
          <div className="space-y-3 p-4 lg:p-5">
            {field(
              `${t("form.title")} *`,
              <input
                name="title"
                required
                autoFocus={mode === "create"}
                defaultValue={initial.title}
                className={FIELD}
              />,
            )}
            <div className="grid grid-cols-2 gap-3">
              {field(
                `${t("meeting.field.held_at")} *`,
                <DateField name="held_at" defaultValue={initial.held_at} />,
              )}
              {field(
                t("crm.place"),
                <input name="place" defaultValue={initial.place} className={FIELD} />,
              )}
            </div>
            {field(
              `${t("meeting.field.company")} *`,
              <Select name="company_id" defaultValue={initial.company_id ?? ""}>
                <option value="">{t("meeting.pick")}</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.label}
                  </option>
                ))}
              </Select>,
            )}
            {field(
              `${t("meeting.field.legal_status")} *`,
              <Select name="legal_status" defaultValue={initial.legal_status}>
                <option value="">{t("meeting.pick")}</option>
                {LEGAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`meeting.legal.${status}` as MessageKey)}
                  </option>
                ))}
              </Select>,
            )}
            <CheckList
              name="project_ids"
              label={`${t("meeting.field.projects")} *`}
              items={projects}
              initial={initial.project_ids}
            />
            {uyushmalar.length > 0 &&
              field(
                t("meeting.field.uyushma"),
                <Select name="uyushma_id" defaultValue={initial.uyushma_id ?? ""}>
                  <option value="">—</option>
                  {uyushmalar.map((uyushma) => (
                    <option key={uyushma.id} value={uyushma.id}>
                      {uyushma.label}
                    </option>
                  ))}
                </Select>,
              )}
          </div>
        </Panel>

        <Panel title={t("meeting.content")} className="xl:col-span-2 xl:col-start-1 xl:row-start-1">
          <div className="space-y-4 p-4 lg:p-5">
            {field(`${t("meeting.field.discussed")} *`, area("description", 3))}
            {field(
              `${t("meeting.field.agreed")} *`,
              area("agreed", 4),
              t("meeting.field.agreedHint"),
            )}
            {field(t("meeting.field.open_issues"), area("open_issues", 2))}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
              {field(
                `${t("meeting.field.next_step")} *`,
                area("next_steps", 2),
                t("meeting.nextStepHint"),
              )}
              {field(
                `${t("meeting.field.responsible")} *`,
                <Select
                  name="responsible_id"
                  defaultValue={initial.responsible_id ?? ""}
                >
                  <option value="">{t("meeting.pick")}</option>
                  {responsibles.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.label}
                    </option>
                  ))}
                </Select>,
              )}
            </div>
          </div>
        </Panel>

        <Panel title={t("meeting.participants")} className="xl:col-span-2 xl:col-start-1 xl:row-start-2">
          <div className="space-y-3 p-4 lg:p-5">
            {field(
              `${t("meeting.field.external")} *`,
              area("participants", 2),
              t("meeting.field.externalHint"),
            )}
            <CheckList
              name="staff_ids"
              label={`${t("meeting.field.staff")} *`}
              items={people}
              initial={initial.staff_ids}
            />
          </div>
        </Panel>

        <Panel title={t("crm.transcript")} className="xl:col-span-2 xl:col-start-1 xl:row-start-3">
          <div className="space-y-3 p-4 lg:p-5">
            <textarea
              name="transcript"
              rows={mode === "create" ? 12 : 8}
              defaultValue={initial.transcript}
              placeholder={t("ai.transcriptPlaceholder")}
              aria-label={t("crm.transcript")}
              className={`${FIELD} scroll-thin resize-y font-mono text-xs leading-relaxed`}
            />
            {mode === "create" &&
              field(
                t("ai.speechLang"),
                <Select name="lang" defaultValue="uz-UZ">
                  <option value="uz-UZ">UZ</option>
                  <option value="ru-RU">RU</option>
                  <option value="en-US">EN</option>
                </Select>,
              )}
          </div>
        </Panel>
      </div>
    </form>
  );
}
