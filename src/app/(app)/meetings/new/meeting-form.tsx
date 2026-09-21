"use client";

import { useRef, useState } from "react";
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
import {
  LEGAL_STATUSES,
  LIST_FIELDS,
  forEmpty,
  suggestedFields,
  type MeetingSuggestion,
  type SuggestedField,
} from "@/lib/meeting-fields";
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

/** What a suggestion added to each list, so it can be taken back out. */
type Added = Partial<Record<(typeof LIST_FIELDS)[number], number[]>>;

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
 *
 * "Fill from transcript" is the TZ's second step — the AI fills the fields as
 * a suggestion, a person reviews them. A proposal goes only into a field that
 * is still empty, and says so under it until the person touches that field;
 * nothing is saved until they press save. A suggestion stored with a recorded
 * meeting arrives the same way when the form opens.
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
  suggestion,
}: {
  mode: "create" | "edit";
  meetingId?: number;
  initial: MeetingFormValues;
  companies: Option[];
  responsibles: Option[];
  people: Option[];
  projects: Option[];
  uyushmalar: Option[];
  /** What the AI proposed for this meeting and nobody has reviewed yet. */
  suggestion?: MeetingSuggestion | null;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [analyze, setAnalyze] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  /** Only proposals the form can show: a person or company not on offer here is dropped. */
  const offered = (s: MeetingSuggestion): MeetingSuggestion => ({
    ...s,
    company_id: companies.some((c) => c.id === s.company_id) ? s.company_id : undefined,
    responsible_id: responsibles.some((p) => p.id === s.responsible_id) ? s.responsible_id : undefined,
    project_ids: s.project_ids?.filter((id) => projects.some((p) => p.id === id)),
    staff_ids: s.staff_ids?.filter((id) => people.some((p) => p.id === id)),
  });
  /**
   * `current` with the suggestion put in: into the empty fields, and added to
   * the two lists. What was added to a list is returned too, so it can be
   * taken out again without touching what a person ticked.
   */
  const apply = (current: MeetingFormValues, s: MeetingSuggestion) => {
    const open = forEmpty(offered(s), current);
    const next: Record<string, unknown> = { ...current };
    const added: Added = {};
    const fields = suggestedFields(open);
    for (const key of fields) {
      if (key === "project_ids" || key === "staff_ids") {
        added[key] = open[key];
        next[key] = [...current[key], ...(open[key] ?? [])];
      } else next[key] = open[key];
    }
    return {
      values: next as unknown as MeetingFormValues,
      fields,
      added,
      heard: open.company_heard ?? null,
    };
  };
  const [start] = useState(() =>
    suggestion
      ? apply(initial, suggestion)
      : { values: initial, fields: [], added: {}, heard: null },
  );
  // The fields are uncontrolled; a new `values` takes effect by remounting
  // them under a new key, after reading back what was typed so nothing is lost.
  const [values, setValues] = useState<MeetingFormValues>(start.values);
  const [version, setVersion] = useState(0);
  const [marked, setMarked] = useState<Set<SuggestedField>>(() => new Set(start.fields));
  const [added, setAdded] = useState<Added>(start.added);
  const [heard, setHeard] = useState<string | null>(start.heard);
  const [lang, setLang] = useState("uz-UZ");
  const [prefilling, setPrefilling] = useState(false);
  const [note, setNote] = useState<{ text: string; failed: boolean } | null>(null);

  /** What the form holds right now, typed or proposed. */
  function readForm(): MeetingFormValues {
    const form = new FormData(formRef.current!);
    const text = (key: string) => String(form.get(key) ?? "");
    const id = (key: string) => Number(form.get(key)) || null;
    const ids = (key: string) => form.getAll(key).map(Number).filter(Boolean);
    return {
      title: text("title"),
      held_at: text("held_at"),
      company_id: id("company_id"),
      legal_status: text("legal_status"),
      uyushma_id: id("uyushma_id"),
      place: text("place"),
      participants: text("participants"),
      description: text("description"),
      agreed: text("agreed"),
      open_issues: text("open_issues"),
      next_steps: text("next_steps"),
      responsible_id: id("responsible_id"),
      transcript: text("transcript"),
      project_ids: ids("project_ids"),
      staff_ids: ids("staff_ids"),
    };
  }

  function remount(next: MeetingFormValues) {
    setValues(next);
    setVersion((v) => v + 1);
  }

  async function prefill() {
    const current = readForm();
    if (current.transcript.trim().length < 40) {
      setNote({ text: t("meeting.ai.tooShort"), failed: true });
      return;
    }
    setPrefilling(true);
    setNote(null);
    try {
      const response = await fetch("/api/ai/meeting/prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: current.transcript,
          title: current.title,
          lang,
          meeting_id: meetingId ?? null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        suggestion?: MeetingSuggestion;
        error?: string;
      };
      if (!response.ok || !data.suggestion) {
        const key: MessageKey =
          data.error === "AI_UNAVAILABLE"
            ? "meeting.ai.unavailable"
            : data.error === "TRANSCRIPT_TOO_SHORT"
              ? "meeting.ai.tooShort"
              : "meeting.ai.failed";
        setNote({ text: t(key), failed: true });
        return;
      }
      const result = apply(current, data.suggestion);
      if (result.fields.length === 0 && !result.heard) {
        setNote({ text: t("meeting.ai.none"), failed: false });
        return;
      }
      remount(result.values);
      setMarked((before) => new Set([...before, ...result.fields]));
      setAdded((before) => ({
        project_ids: [...(before.project_ids ?? []), ...(result.added.project_ids ?? [])],
        staff_ids: [...(before.staff_ids ?? []), ...(result.added.staff_ids ?? [])],
      }));
      if (result.heard) setHeard(result.heard);
      // The button that was pressed is gone with the remount; the notice
      // saying what happened takes the focus instead of the page's body.
      requestAnimationFrame(() => noticeRef.current?.focus());
    } catch {
      setNote({ text: t("meeting.ai.failed"), failed: true });
    } finally {
      setPrefilling(false);
    }
  }

  /** Takes out every proposal nobody has touched, and nothing else. */
  function clearSuggestions() {
    const current = readForm();
    const next: Record<string, unknown> = { ...current };
    for (const key of marked) {
      if (key === "project_ids" || key === "staff_ids")
        next[key] = current[key].filter((id) => !added[key]?.includes(id));
      else next[key] = key.endsWith("_id") ? null : "";
    }
    remount(next as unknown as MeetingFormValues);
    setMarked(new Set());
    setAdded({});
    setHeard(null);
  }

  /** A field a person has changed is theirs now, whoever filled it first. */
  function touched(event: React.FormEvent<HTMLFormElement>) {
    const name = (event.target as HTMLInputElement).name as SuggestedField;
    if (!marked.has(name)) return;
    setMarked((before) => {
      const next = new Set(before);
      next.delete(name);
      return next;
    });
    if (name === "company_id") setHeard(null);
    if (name === "project_ids" || name === "staff_ids")
      setAdded((before) => ({ ...before, [name]: undefined }));
  }

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
            lang: mode === "create" ? lang : undefined,
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

  const mark = (key: SuggestedField) =>
    marked.has(key) ? (
      <span className="mt-1 block text-[11px] font-medium text-sky-700 dark:text-sky-300">
        {t("meeting.ai.mark")}
      </span>
    ) : null;
  const field = (
    text: string,
    control: React.ReactNode,
    hint?: string,
    key?: SuggestedField,
  ) => (
    <label className="block">
      <span className="muted mb-1 block text-xs font-medium">{text}</span>
      {control}
      {key && mark(key)}
      {hint && <span className="muted mt-1 block text-[11px]">{hint}</span>}
    </label>
  );
  const area = (name: keyof MeetingFormValues & SuggestedField, rows: number) => (
    <textarea
      name={name}
      rows={rows}
      defaultValue={String(values[name] ?? "")}
      className={`${FIELD} resize-y`}
    />
  );

  return (
    <form ref={formRef} onSubmit={submit} onChange={touched}>
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
              disabled={busy || prefilling}
              onClick={() => setAnalyze(false)}
            >
              {t("common.save")}
            </Button>
            {mode === "create" && (
              <Button
                type="submit"
                icon="shield"
                disabled={busy || prefilling}
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

      {marked.size > 0 && (
        <div
          ref={noticeRef}
          tabIndex={-1}
          role="status"
          className="mb-4 flex flex-col gap-2 rounded-xl bg-sky-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
            {t("meeting.ai.formNotice")}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start sm:self-auto"
            onClick={clearSuggestions}
          >
            {t("meeting.ai.clear")}
          </Button>
        </div>
      )}

      {/* One column on a phone, in the order a meeting is filled in: what and
          when first — the title is the one field a save needs — then what was
          said, who was there, and the transcript last. The markup is in that
          order too, so focus and a screen reader follow what is on screen. On
          a desk the same four panels are placed by grid position alone: the
          facts on the right spanning every row, the other three stacked on the
          left. Only the right column may end early; a panel beside a taller
          one in the same row would leave a gap between panels on the left.
          The trailing 1fr row takes the facts panel's extra height when it
          is the taller column, so the left panels stay together. */}
      <div
        key={version}
        className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-3 xl:grid-rows-[auto_auto_auto_1fr]"
      >
        <Panel title={t("meeting.facts")} className="xl:col-start-3 xl:row-span-4 xl:row-start-1">
          <div className="space-y-3 p-4 lg:p-5">
            {field(
              `${t("form.title")} *`,
              <input
                name="title"
                required
                autoFocus={mode === "create"}
                defaultValue={values.title}
                className={FIELD}
              />,
            )}
            <div className="grid grid-cols-2 gap-3">
              {field(
                `${t("meeting.field.held_at")} *`,
                <DateField name="held_at" defaultValue={values.held_at} />,
                undefined,
                "held_at",
              )}
              {field(
                t("crm.place"),
                <input name="place" defaultValue={values.place} className={FIELD} />,
                undefined,
                "place",
              )}
            </div>
            {field(
              `${t("meeting.field.company")} *`,
              <Select name="company_id" defaultValue={values.company_id ?? ""}>
                <option value="">{t("meeting.pick")}</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.label}
                  </option>
                ))}
              </Select>,
              heard ? t("meeting.ai.companyHeard").replace("{name}", heard) : undefined,
              "company_id",
            )}
            {field(
              `${t("meeting.field.legal_status")} *`,
              <Select name="legal_status" defaultValue={values.legal_status}>
                <option value="">{t("meeting.pick")}</option>
                {LEGAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`meeting.legal.${status}` as MessageKey)}
                  </option>
                ))}
              </Select>,
              undefined,
              "legal_status",
            )}
            <div>
              <CheckList
                name="project_ids"
                label={`${t("meeting.field.projects")} *`}
                items={projects}
                initial={values.project_ids}
              />
              {mark("project_ids")}
            </div>
            {uyushmalar.length > 0 &&
              field(
                t("meeting.field.uyushma"),
                <Select name="uyushma_id" defaultValue={values.uyushma_id ?? ""}>
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
            {field(
              `${t("meeting.field.discussed")} *`,
              area("description", 3),
              undefined,
              "description",
            )}
            {field(
              `${t("meeting.field.agreed")} *`,
              area("agreed", 4),
              t("meeting.field.agreedHint"),
              "agreed",
            )}
            {field(t("meeting.field.open_issues"), area("open_issues", 2), undefined, "open_issues")}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
              {field(
                `${t("meeting.field.next_step")} *`,
                area("next_steps", 2),
                t("meeting.nextStepHint"),
                "next_steps",
              )}
              {field(
                `${t("meeting.field.responsible")} *`,
                <Select
                  name="responsible_id"
                  defaultValue={values.responsible_id ?? ""}
                >
                  <option value="">{t("meeting.pick")}</option>
                  {responsibles.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.label}
                    </option>
                  ))}
                </Select>,
                undefined,
                "responsible_id",
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
              "participants",
            )}
            <div>
              <CheckList
                name="staff_ids"
                label={`${t("meeting.field.staff")} *`}
                items={people}
                initial={values.staff_ids}
              />
              {mark("staff_ids")}
            </div>
          </div>
        </Panel>

        <Panel title={t("crm.transcript")} className="xl:col-span-2 xl:col-start-1 xl:row-start-3">
          <div className="space-y-3 p-4 lg:p-5">
            <textarea
              name="transcript"
              rows={mode === "create" ? 12 : 8}
              defaultValue={values.transcript}
              placeholder={t("ai.transcriptPlaceholder")}
              aria-label={t("crm.transcript")}
              className={`${FIELD} scroll-thin resize-y font-mono text-xs leading-relaxed`}
            />
            {mode === "create" &&
              field(
                t("ai.speechLang"),
                <Select value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="uz-UZ">UZ</option>
                  <option value="ru-RU">RU</option>
                  <option value="en-US">EN</option>
                </Select>,
              )}
            <div className="space-y-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={prefilling || busy}
                aria-describedby="prefill-hint"
                onClick={prefill}
              >
                {prefilling ? t("meeting.ai.filling") : t("meeting.ai.fill")}
              </Button>
              <p id="prefill-hint" className="muted text-[11px]">
                {t("meeting.ai.fillHint")}
              </p>
              {note && (
                <p
                  role={note.failed ? "alert" : "status"}
                  className={`text-xs font-medium ${
                    note.failed ? "text-amber-700 dark:text-amber-400" : "muted"
                  }`}
                >
                  {note.text}
                </p>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </form>
  );
}
