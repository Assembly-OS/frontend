"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, FIELD, PageHeader, Panel, Select } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import { ASSOCIATION_STATUSES, KONTURS } from "@/lib/crm-stages";

export interface AssociationFormValues {
  name: string;
  name_uzc: string;
  name_ru: string;
  name_en: string;
  short_name: string;
  sector: string;
  kontur: string;
  region: string;
  responsible_user_id: number | null;
  head_user_id: number | null;
  head_name: string;
  head_position: string;
  head_contact: string;
  members_count: number;
  status: string;
  project_ids: number[];
}

export interface AssociationFormOptions {
  responsible: { id: number; full_name: string }[];
  heads: { id: number; full_name: string }[];
  projects: { id: number; code: string; name: string }[];
}

export const EMPTY_ASSOCIATION: AssociationFormValues = {
  name: "",
  name_uzc: "",
  name_ru: "",
  name_en: "",
  short_name: "",
  sector: "",
  kontur: "",
  region: "",
  responsible_user_id: null,
  head_user_id: null,
  head_name: "",
  head_position: "",
  head_contact: "",
  members_count: 0,
  status: "FAOL",
  project_ids: [],
};

/**
 * The association's card as a form (TZ 6.1): the name in the platform's
 * four languages, the sector and contour, who answers for it on the
 * Assembly's side and who leads it on its own, how many companies it
 * holds, which projects it takes part in. Required is what the TZ marks
 * required; the rest is filled as it becomes known.
 */
export function AssociationForm({
  id,
  initial,
  options,
}: {
  id?: number;
  initial: AssociationFormValues;
  options: AssociationFormOptions;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectIds, setProjectIds] = useState<number[]>(initial.project_ids);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const body = {
      name: text("name"),
      name_uzc: text("name_uzc") || null,
      name_ru: text("name_ru") || null,
      name_en: text("name_en") || null,
      short_name: text("short_name") || null,
      sector: text("sector"),
      kontur: text("kontur") || null,
      region: text("region") || null,
      responsible_user_id: text("responsible_user_id") || null,
      head_user_id: text("head_user_id") || null,
      head_name: text("head_name") || null,
      head_position: text("head_position") || null,
      head_contact: text("head_contact") || null,
      members_count: Number(text("members_count")) || 0,
      status: text("status") || "FAOL",
      project_ids: projectIds,
    };
    if (!body.name || !body.sector) {
      setError(t("form.required"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(id ? `/api/associations/${id}` : "/api/associations", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { id?: number; ok?: boolean };
      if (!response.ok) {
        setError(t("common.error"));
        return;
      }
      router.push(`/associations/${id ?? data.id}`);
      router.refresh();
    } catch {
      setError(t("common.error"));
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
  const back = id ? `/associations/${id}` : "/associations";

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={id ? initial.name : t("assoc.new")}
        action={
          <div className="flex gap-2">
            <Button href={back} variant="secondary">
              {t("ai.cancelEdit")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? t("common.loading") : t("assoc.save")}
            </Button>
          </div>
        }
      />

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-2">
        <Panel title={t("knowledge.kind.uyushma")}>
          <div className="space-y-3 p-5">
            {label(`${t("assoc.field.name")} *`, <input name="name" required autoFocus maxLength={200} defaultValue={initial.name} className={FIELD} />)}
            {label(t("assoc.field.name_uzc"), <input name="name_uzc" maxLength={200} defaultValue={initial.name_uzc} className={FIELD} />)}
            {label(t("assoc.field.name_ru"), <input name="name_ru" maxLength={200} defaultValue={initial.name_ru} className={FIELD} />)}
            {label(t("assoc.field.name_en"), <input name="name_en" maxLength={200} defaultValue={initial.name_en} className={FIELD} />)}
            {label(t("assoc.field.short"), <input name="short_name" maxLength={80} defaultValue={initial.short_name} className={FIELD} />)}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
              {label(`${t("assoc.field.sector")} *`, <input name="sector" required maxLength={120} defaultValue={initial.sector} className={FIELD} />)}
              {label(t("assoc.field.region"), <input name="region" maxLength={120} defaultValue={initial.region} className={FIELD} />)}
            </div>
            {label(
              `${t("assoc.field.kontur")} *`,
              <Select name="kontur" required defaultValue={initial.kontur}>
                <option value="">—</option>
                {KONTURS.map((kontur) => (
                  <option key={kontur} value={kontur}>
                    {t(`dept.${kontur}` as MessageKey)}
                  </option>
                ))}
              </Select>,
            )}
            {label(
              t("assoc.field.status"),
              <Select name="status" defaultValue={initial.status}>
                {ASSOCIATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`assoc.status.${status}` as MessageKey)}
                  </option>
                ))}
              </Select>,
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title={t("assoc.field.head")}>
            <div className="space-y-3 p-5">
              {label(
                `${t("assoc.field.responsible")} *`,
                <Select name="responsible_user_id" required defaultValue={initial.responsible_user_id ?? ""}>
                  <option value="">—</option>
                  {options.responsible.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                    </option>
                  ))}
                </Select>,
              )}
              {label(`${t("assoc.field.head")} *`, <input name="head_name" required maxLength={160} defaultValue={initial.head_name} className={FIELD} />)}
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                {label(t("assoc.field.headPosition"), <input name="head_position" maxLength={120} defaultValue={initial.head_position} className={FIELD} />)}
                {label(t("assoc.field.headContact"), <input name="head_contact" maxLength={200} defaultValue={initial.head_contact} className={FIELD} />)}
              </div>
              {label(
                t("assoc.field.headAccount"),
                <Select name="head_user_id" defaultValue={initial.head_user_id ?? ""}>
                  <option value="">—</option>
                  {options.heads.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                    </option>
                  ))}
                </Select>,
              )}
              {label(
                t("assoc.field.members"),
                <input name="members_count" type="number" min={0} inputMode="numeric" defaultValue={initial.members_count} className={`${FIELD} tabular-nums`} />,
              )}
            </div>
          </Panel>

          <Panel title={t("assoc.field.projects")}>
            {options.projects.length === 0 ? (
              <p className="muted px-5 py-6 text-center text-xs">{t("assoc.noProjects")}</p>
            ) : (
              <ul className="max-h-72 divide-y overflow-y-auto">
                {options.projects.map((project) => {
                  const checked = projectIds.includes(project.id);
                  return (
                    <li key={project.id}>
                      <label className="flex min-h-10 cursor-pointer items-center gap-3 px-5 py-2 text-sm hover:bg-[var(--surface)]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setProjectIds(
                              checked ? projectIds.filter((item) => item !== project.id) : [...projectIds, project.id],
                            )
                          }
                        />
                        <span className="muted font-mono text-xs">{project.code}</span>
                        <span className="min-w-0 flex-1 truncate">{project.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </form>
  );
}
