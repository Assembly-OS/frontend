"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { CheckList } from "@/components/check-list";
import {
  Button,
  DateField,
  FIELD,
  IconButton,
  PageHeader,
  Panel,
  Select,
} from "@/components/ui";
import {
  CURRENCIES,
  KELISHUV_KINDS,
  KELISHUV_STATUSES,
  kelishuvCode,
} from "@/lib/kelishuv-fields";
import type { MessageKey } from "@/lib/i18n";

type Option = { id: number; label: string; hint?: string | null };

/** One obligation line as the form holds it. `key` is only for React. */
interface ObligationLine {
  key: number;
  id: number | null;
  description: string;
  owner_user_id: string;
  owner_name: string;
  deadline: string;
}

export interface KelishuvFormValues {
  title: string;
  kind: string;
  content: string;
  loyiha_id: number | null;
  meeting: { id: number; title: string } | null;
  amount: string;
  currency: string;
  signed_on: string;
  valid_until: string;
  responsible_id: number | null;
  status: string;
  party_ids: number[];
  obligations: Omit<ObligationLine, "key">[];
}

const ERRORS: Record<string, MessageKey> = {
  TITLE_REQUIRED: "form.required",
  BAD_TERM: "kelishuv.errTerm",
  BAD_AMOUNT: "kelishuv.errAmount",
  GONE: "kelishuv.errGone",
  FORBIDDEN: "kelishuv.errForbidden",
};

/**
 * Recording an agreement, or correcting one, in the shape of TZ block 1.2.
 *
 * The obligations are the point: an agreement is what it binds each side to,
 * one item per thing owed. Each line names who owes it — somebody in the
 * Assembly, picked from the staff, or the other side, written as text — and
 * by when. A new line is sent to its owner with reminders the moment the
 * agreement is saved; marking it done stays with them, which is why there is
 * no status here per line.
 *
 * As with a meeting, only the title is refused when missing. Everything else
 * the TZ requires is starred, and a record without it is saved and shown as
 * incomplete — a draft while the terms are still moving is exactly the record
 * that should exist.
 */
export function KelishuvForm({
  mode,
  kelishuvId,
  initial,
  companies,
  people,
  projects,
}: {
  mode: "create" | "edit";
  kelishuvId?: number;
  initial: KelishuvFormValues;
  companies: Option[];
  people: Option[];
  projects: Option[];
}) {
  const t = useT();
  const router = useRouter();
  const nextKey = useRef(initial.obligations.length);
  const [lines, setLines] = useState<ObligationLine[]>(() =>
    initial.obligations.length
      ? initial.obligations.map((line, index) => ({ ...line, key: index }))
      : [{ key: 0, id: null, description: "", owner_user_id: "", owner_name: "", deadline: "" }],
  );
  const [meeting, setMeeting] = useState(initial.meeting);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLine() {
    nextKey.current += 1;
    setLines((current) => [
      ...current,
      {
        key: nextKey.current,
        id: null,
        description: "",
        owner_user_id: "",
        owner_name: "",
        deadline: "",
      },
    ]);
  }
  function patchLine(key: number, patch: Partial<ObligationLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }
  function removeLine(key: number) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "");
    if (!text("title").trim()) {
      setError(t("form.required"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        mode === "create" ? "/api/crm/kelishuvlar" : `/api/crm/kelishuvlar/${kelishuvId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: text("title"),
            kind: text("kind") || null,
            content: text("content"),
            loyiha_id: text("loyiha_id") || null,
            meeting_id: meeting?.id ?? null,
            amount: text("amount"),
            currency: text("currency"),
            signed_on: text("signed_on"),
            valid_until: text("valid_until"),
            responsible_id: text("responsible_id") || null,
            status: text("status"),
            party_ids: form.getAll("party_ids").map(Number).filter(Boolean),
            obligations: lines.map((line) => ({
              id: line.id,
              description: line.description,
              owner_user_id: line.owner_user_id || null,
              owner_name: line.owner_user_id ? null : line.owner_name,
              deadline: line.deadline || null,
            })),
          }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        id?: number;
        error?: string;
      };
      if (!response.ok || !data.id) {
        setError(t(ERRORS[data.error ?? ""] ?? "common.error"));
        return;
      }
      router.push(`/agreements/${data.id}`);
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

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={mode === "create" ? t("kelishuv.new") : t("kelishuv.editTitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              href={mode === "create" ? "/agreements" : `/agreements/${kelishuvId}`}
              variant="secondary"
            >
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
          {error}
        </p>
      )}

      {/* The same arrangement as the meeting form: markup in the phone's
          filling order — facts, what was agreed, what each side owes — and on
          a desk the facts on the right spanning every row. The trailing 1fr
          row is what keeps the left panels together: a grid hands the extra
          height of a tall spanning item to the rows it spans, which opened a
          gap under the content panel; spanning into a flexible row lets that
          row take all of it instead. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-3 xl:grid-rows-[auto_auto_1fr]">
        <Panel title={t("meeting.facts")} className="xl:col-start-3 xl:row-span-3 xl:row-start-1">
          <div className="space-y-3 p-4 lg:p-5">
            {field(
              `${t("kelishuv.field.title")} *`,
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
                `${t("kelishuv.field.kind")} *`,
                <Select name="kind" defaultValue={initial.kind}>
                  <option value="">{t("meeting.pick")}</option>
                  {KELISHUV_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`kelishuv.kind.${kind}` as MessageKey)}
                    </option>
                  ))}
                </Select>,
              )}
              {field(
                `${t("kelishuv.field.status")} *`,
                <Select name="status" defaultValue={initial.status}>
                  {KELISHUV_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(`kelishuv.status.${status}` as MessageKey)}
                    </option>
                  ))}
                </Select>,
              )}
            </div>
            <CheckList
              name="party_ids"
              label={`${t("kelishuv.field.parties")} *`}
              items={companies}
              initial={initial.party_ids}
            />
            {field(
              `${t("kelishuv.field.project")} *`,
              <Select name="loyiha_id" defaultValue={initial.loyiha_id ?? ""}>
                <option value="">{t("meeting.pick")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.label}
                  </option>
                ))}
              </Select>,
            )}
            {meeting && (
              <div>
                <span className="muted mb-1 block text-xs font-medium">
                  {t("kelishuv.field.meeting")}
                </span>
                <p className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="muted font-mono text-xs">
                      M-{String(meeting.id).padStart(4, "0")}
                    </span>{" "}
                    {meeting.title}
                  </span>
                  <IconButton
                    icon="close"
                    label={t("kelishuv.obligation.remove")}
                    onClick={() => setMeeting(null)}
                  />
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {field(
                t("kelishuv.field.signed_on"),
                <DateField name="signed_on" defaultValue={initial.signed_on} />,
              )}
              {field(
                t("kelishuv.field.valid_until"),
                <DateField name="valid_until" defaultValue={initial.valid_until} />,
              )}
            </div>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
              {field(
                t("kelishuv.field.amount"),
                <input
                  name="amount"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  defaultValue={initial.amount}
                  className={`${FIELD} tabular-nums`}
                />,
              )}
              {field(
                t("kelishuv.field.currency"),
                <Select name="currency" defaultValue={initial.currency || "UZS"}>
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </Select>,
              )}
            </div>
            {field(
              `${t("kelishuv.field.responsible")} *`,
              <Select name="responsible_id" defaultValue={initial.responsible_id ?? ""}>
                <option value="">{t("meeting.pick")}</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.label}
                  </option>
                ))}
              </Select>,
            )}
          </div>
        </Panel>

        <Panel title={t("kelishuv.field.content")} className="xl:col-span-2 xl:col-start-1 xl:row-start-1">
          <div className="p-4 lg:p-5">
            <textarea
              name="content"
              rows={4}
              defaultValue={initial.content}
              aria-label={t("kelishuv.field.content")}
              placeholder={t("kelishuv.field.contentHint")}
              className={`${FIELD} resize-y`}
            />
          </div>
        </Panel>

        <Panel
          title={`${t("kelishuv.field.obligations")} *`}
          className="xl:col-span-2 xl:col-start-1 xl:row-start-2"
          action={
            <Button type="button" variant="ghost" size="sm" icon="plus" onClick={addLine}>
              {t("kelishuv.addObligation")}
            </Button>
          }
        >
          <div className="space-y-3 p-4 lg:p-5">
            <p className="muted text-xs">{t("kelishuv.field.obligationsHint")}</p>
            <ol className="space-y-3">
              {lines.map((line, index) => (
                <li
                  key={line.key}
                  className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="space-y-3">
                    {field(
                      `${index + 1}. ${t("kelishuv.obligation.what")}`,
                      <textarea
                        rows={2}
                        value={line.description}
                        onChange={(event) =>
                          patchLine(line.key, { description: event.target.value })
                        }
                        className={`${FIELD} resize-y`}
                      />,
                    )}
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                      {field(
                        t("kelishuv.obligation.ours"),
                        <Select
                          value={line.owner_user_id}
                          onChange={(event) =>
                            patchLine(line.key, { owner_user_id: event.target.value })
                          }
                        >
                          <option value="">—</option>
                          {people.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.label}
                            </option>
                          ))}
                        </Select>,
                      )}
                      {field(
                        t("kelishuv.obligation.theirs"),
                        <input
                          value={line.owner_user_id ? "" : line.owner_name}
                          disabled={Boolean(line.owner_user_id)}
                          onChange={(event) =>
                            patchLine(line.key, { owner_name: event.target.value })
                          }
                          placeholder={t("kelishuv.obligation.theirsPlaceholder")}
                          className={`${FIELD} disabled:opacity-50`}
                        />,
                      )}
                      {field(
                        t("kelishuv.obligation.deadline"),
                        <DateField
                          value={line.deadline}
                          onChange={(event) =>
                            patchLine(line.key, { deadline: event.target.value })
                          }
                        />,
                      )}
                    </div>
                  </div>
                  <div className="flex sm:items-start">
                    <IconButton
                      icon="trash"
                      label={`${t("kelishuv.obligation.remove")} ${index + 1}`}
                      onClick={() => removeLine(line.key)}
                    />
                  </div>
                </li>
              ))}
            </ol>
            <p className="muted text-[11px]">{t("kelishuv.obligationsNote")}</p>
          </div>
        </Panel>
      </div>

      {/* The code is shown once the record exists, as it will be cited. */}
      {mode === "edit" && kelishuvId && (
        <p className="muted mt-4 font-mono text-xs">{kelishuvCode(kelishuvId)}</p>
      )}
    </form>
  );
}
