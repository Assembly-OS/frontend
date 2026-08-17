"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import {
  Button,
  DateField,
  FIELD,
  PageHeader,
  Panel,
  Select,
} from "@/components/ui";

/**
 * Filing a meeting that already happened.
 *
 * The transcript box and the AI button are the point. A person pastes what was
 * said, presses analyse, and the summary, the key points, the decisions and the
 * commitments come back attached to the right company — instead of being
 * retyped into four fields by the one person who was in the room.
 *
 * Analysis is a separate press rather than automatic on save, because a
 * two-line note about a phone call does not need a model run and should not
 * cost one.
 */
export function MeetingForm({
  companies,
  staff,
  presetCompany,
}: {
  companies: { id: number; name: string }[];
  staff: { id: number; full_name: string }[];
  presetCompany: number | null;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [analyze, setAnalyze] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      setNotice({ ok: false, text: t("form.required") });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/crm/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form.entries()),
          company_id: form.get("company_id") || null,
          responsible_id: form.get("responsible_id") || null,
          analyze,
        }),
      });
      const data = (await response.json()) as {
        id?: number;
        agreements?: number;
        analysis?: { keyPoints?: string[]; created?: number } | null;
        error?: string;
      };
      if (!response.ok || !data.id) {
        setNotice({ ok: false, text: t("common.error") });
        return;
      }
      const company = form.get("company_id");
      router.push(company ? `/companies/${company}` : "/meetings");
    } catch {
      setNotice({ ok: false, text: t("common.error") });
    } finally {
      setBusy(false);
    }
  }

  const label = (text: string, control: React.ReactNode) => (
    <label className="block">
      <span className="muted mb-1 block text-xs font-medium">{text}</span>
      {control}
    </label>
  );

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={t("crm.newMeeting")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button href="/meetings" variant="secondary">
              {t("ai.cancelEdit")}
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={busy}
              onClick={() => setAnalyze(false)}
            >
              {t("common.save")}
            </Button>
            <Button type="submit" icon="shield" disabled={busy} onClick={() => setAnalyze(true)}>
              {busy && analyze ? t("crm.analyzing") : t("crm.analyze")}
            </Button>
          </div>
        }
      />

      {notice && (
        <p
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            notice.ok
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={t("crm.transcript")}>
            <div className="space-y-3 p-5">
              {label(
                t("crm.transcript"),
                <textarea
                  name="transcript"
                  rows={16}
                  placeholder={t("ai.transcriptPlaceholder")}
                  className={`${FIELD} scroll-thin resize-y font-mono text-xs leading-relaxed`}
                />,
              )}
              {label(
                t("tasks.description"),
                <textarea name="description" rows={3} className={`${FIELD} resize-y`} />,
              )}
              {label(
                t("crm.tab.agreements"),
                <textarea name="next_steps" rows={3} className={`${FIELD} resize-y`} />,
              )}
            </div>
          </Panel>
        </div>

        <Panel title={t("crm.newMeeting")}>
          <div className="space-y-3 p-5">
            {label(
              `${t("form.title")} *`,
              <input name="title" required autoFocus className={FIELD} />,
            )}
            {label(
              t("crm.companies"),
              <Select name="company_id" defaultValue={presetCompany ?? ""}>
                <option value="">—</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>,
            )}
            {label(t("form.deadline"), <DateField name="held_at" />)}
            {label(t("crm.place"), <input name="place" className={FIELD} />)}
            {label(
              t("crm.participants"),
              <textarea name="participants" rows={2} className={`${FIELD} resize-y`} />,
            )}
            {label(
              t("crm.field.owner"),
              <Select name="responsible_id" defaultValue="">
                <option value="">—</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </Select>,
            )}
            {label(
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
