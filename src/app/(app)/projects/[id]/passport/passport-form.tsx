"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, DateField, FIELD, PageHeader, Panel, Select } from "@/components/ui";
import { PHASES, TIERS } from "@/lib/project-passport";
import { PROJECT_PRIORITIES } from "@/lib/project-vocab";
import type { MessageKey } from "@/lib/i18n";

type Option = { id: number; label: string; hint?: string | null };

export interface PassportFormValues {
  name: string;
  name_ru: string;
  name_en: string;
  description: string;
  description_ru: string;
  description_en: string;
  klaster_id: number | null;
  tier: string;
  phase: string;
  priority: string;
  stage: string;
  owner_id: number | null;
  leader_name: string;
  deputy_id: number | null;
  deputy_name: string;
  ppp_state: string;
  ppp_public: string;
  ppp_private: string;
  ppp_state_party: string;
  ppp_public_party: string;
  ppp_private_party: string;
  started_at: string;
  deadline: string;
  next_decision_on: string;
  budget: string;
  first_result: string;
}

const ERRORS: Record<string, MessageKey> = {
  REQUIRED: "form.required",
  BAD_PPP: "proj.errPpp",
  BAD_TERM: "proj.errTerm",
  GONE: "proj.errGone",
};

/**
 * A project's passport, block 1.3 of the rebuild TZ, in one column of panels
 * in the order the TZ lists them: what it is called, how it sits in the
 * portfolio, who answers for it, how it is shared, when, and the first result
 * it is admitted on.
 *
 * Only the Uzbek name is refused when missing. Everything else the TZ requires
 * is starred and, left blank, shows on the project as incomplete — a passport
 * is filled in over weeks, as the answers arrive, and refusing a half-done one
 * would lose the half.
 *
 * The partnership shares show their total as they are typed: three numbers
 * that must make a hundred are easy to get wrong and hard to see wrong.
 */
export function PassportForm({
  projectId,
  initial,
  clusters,
  people,
}: {
  projectId: number;
  initial: PassportFormValues;
  clusters: Option[];
  people: Option[];
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState({
    state: initial.ppp_state,
    public: initial.ppp_public,
    private: initial.ppp_private,
  });
  const [owner, setOwner] = useState(initial.owner_id ? String(initial.owner_id) : "");
  const [deputy, setDeputy] = useState(initial.deputy_id ? String(initial.deputy_id) : "");

  const given = [shares.state, shares.public, shares.private].filter((v) => v.trim() !== "");
  const total = given.reduce((sum, v) => sum + (Number(v) || 0), 0);
  // Only once all three are typed can the total be wrong; a partial one is
  // still being filled in.
  const totalWrong = given.length === 3 && total !== 100;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    if (!String(body.name ?? "").trim()) {
      setError(t("form.required"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(t(ERRORS[data.error ?? ""] ?? "common.error"));
        return;
      }
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const field = (text: string, control: React.ReactNode, hint?: string) => (
    <label className="block min-w-0">
      <span className="muted mb-1 block text-xs font-medium">{text}</span>
      {control}
      {hint && <span className="muted mt-1 block text-[11px]">{hint}</span>}
    </label>
  );
  const input = (name: keyof PassportFormValues, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      name={name}
      defaultValue={String(initial[name] ?? "")}
      className={FIELD}
      {...extra}
    />
  );
  const personOrName = (
    label: string,
    selectName: "owner_id" | "deputy_id",
    textName: "leader_name" | "deputy_name",
    value: string,
    setValue: (value: string) => void,
  ) => (
    <div className="space-y-2">
      {field(
        `${label} *`,
        <Select name={selectName} value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">—</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.label}
            </option>
          ))}
        </Select>,
      )}
      {/* Picked from the staff wins; the name is for someone outside. */}
      {field(
        t("proj.field.orName"),
        <input
          name={textName}
          defaultValue={initial[textName]}
          disabled={value !== ""}
          className={`${FIELD} disabled:opacity-50`}
        />,
      )}
    </div>
  );

  return (
    <form onSubmit={submit} className="max-w-4xl">
      <PageHeader
        title={t("proj.passport.formTitle")}
        description={initial.name}
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
          {error}
        </p>
      )}

      <div className="space-y-6">
        <Panel title={t("proj.passport.names")}>
          <div className="space-y-3 p-4 lg:p-5">
            <p className="muted text-xs">{t("proj.passport.namesHint")}</p>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
              {(
                [
                  ["UZ", "name", "description"],
                  ["RU", "name_ru", "description_ru"],
                  ["EN", "name_en", "description_en"],
                ] as const
              ).map(([code, nameKey, descriptionKey]) => (
                <div key={code} className="space-y-2">
                  {field(
                    `${t("proj.field.name")} · ${code} *`,
                    input(nameKey, nameKey === "name" ? { required: true } : {}),
                  )}
                  {field(
                    `${t("proj.field.description")} · ${code} *`,
                    <textarea
                      name={descriptionKey}
                      rows={3}
                      defaultValue={initial[descriptionKey]}
                      className={`${FIELD} resize-y`}
                    />,
                  )}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title={t("proj.passport.structure")}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4 sm:grid-cols-2 lg:p-5">
            {field(
              `${t("proj.field.klaster")} *`,
              <Select name="klaster_id" defaultValue={initial.klaster_id ?? ""}>
                <option value="">{t("meeting.pick")}</option>
                {clusters.map((cluster) => (
                  <option key={cluster.id} value={cluster.id}>
                    {cluster.label}
                  </option>
                ))}
              </Select>,
            )}
            {field(
              `${t("proj.field.tier")} *`,
              <Select name="tier" defaultValue={initial.tier}>
                <option value="">{t("meeting.pick")}</option>
                {TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {t(`proj.tier.${tier}` as MessageKey)}
                  </option>
                ))}
              </Select>,
            )}
            {field(
              `${t("proj.field.phase")} *`,
              <Select name="phase" defaultValue={initial.phase}>
                <option value="">{t("meeting.pick")}</option>
                {PHASES.map((phase) => (
                  <option key={phase} value={phase}>
                    {t(`proj.phase.${phase}` as MessageKey)}
                  </option>
                ))}
              </Select>,
            )}
            {field(
              t("proj.field.priority"),
              <Select name="priority" defaultValue={initial.priority}>
                {PROJECT_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {t(`priority.${priority}` as MessageKey)}
                  </option>
                ))}
              </Select>,
            )}
            <div className="sm:col-span-2">{field(t("proj.field.stage"), input("stage"))}</div>
          </div>
        </Panel>

        <Panel title={t("proj.passport.people")}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:grid-cols-2 lg:p-5">
            {personOrName(t("proj.field.leader"), "owner_id", "leader_name", owner, setOwner)}
            {personOrName(t("proj.field.deputy"), "deputy_id", "deputy_name", deputy, setDeputy)}
          </div>
        </Panel>

        <Panel title={`${t("proj.passport.ppp")} *`}>
          <div className="space-y-3 p-4 lg:p-5">
            <p className="muted text-xs">{t("proj.passport.pppHint")}</p>
            {(
              [
                ["state", "ppp_state", "ppp_state_party", "proj.passport.pppState"],
                ["public", "ppp_public", "ppp_public_party", "proj.passport.pppPublic"],
                ["private", "ppp_private", "ppp_private_party", "proj.passport.pppPrivate"],
              ] as const
            ).map(([key, percentName, partyName, label]) => (
              <fieldset key={key} className="min-w-0">
                <legend className="mb-1 text-sm font-medium">{t(label)}</legend>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
                  <label className="block">
                    <span className="muted mb-1 block text-xs font-medium">%</span>
                    <input
                      name={percentName}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      inputMode="numeric"
                      value={shares[key]}
                      onChange={(e) => setShares((s) => ({ ...s, [key]: e.target.value }))}
                      className={`${FIELD} tabular-nums`}
                    />
                  </label>
                  {field(
                    t("proj.passport.pppParty"),
                    <input name={partyName} defaultValue={initial[partyName]} className={FIELD} />,
                  )}
                </div>
              </fieldset>
            ))}
            <p
              aria-live="polite"
              className={`text-xs font-medium tabular-nums ${
                totalWrong ? "text-amber-700 dark:text-amber-400" : "muted"
              }`}
            >
              {t("proj.passport.pppTotal").replace("{n}", String(total))}
            </p>
          </div>
        </Panel>

        <Panel title={t("proj.passport.terms")}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4 sm:grid-cols-2 lg:p-5">
            {field(
              `${t("proj.field.started")} *`,
              <DateField name="started_at" defaultValue={initial.started_at} />,
            )}
            {field(
              `${t("proj.field.targetEnd")} *`,
              <DateField name="deadline" defaultValue={initial.deadline} />,
            )}
            {field(
              `${t("proj.field.nextDecision")} *`,
              <DateField name="next_decision_on" defaultValue={initial.next_decision_on} />,
            )}
            {field(
              t("proj.field.budget"),
              input("budget", {
                type: "number",
                min: 0,
                step: "any",
                inputMode: "decimal",
                className: `${FIELD} tabular-nums`,
              }),
            )}
          </div>
        </Panel>

        <Panel title={`${t("proj.field.firstResult")} *`}>
          {/* The panel's title names the field, so the field carries no
              second label of the same words — only the hint. */}
          <div className="p-4 lg:p-5">
            <textarea
              name="first_result"
              rows={2}
              defaultValue={initial.first_result}
              aria-label={t("proj.field.firstResult")}
              aria-describedby="first-result-hint"
              className={`${FIELD} resize-y`}
            />
            <span id="first-result-hint" className="muted mt-1 block text-[11px]">
              {t("proj.field.firstResultHint")}
            </span>
          </div>
        </Panel>
      </div>
    </form>
  );
}
