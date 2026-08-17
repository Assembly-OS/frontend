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
 * Adding a company by hand.
 *
 * Only the name is required. Everything else is what somebody happens to know
 * at the moment they meet a company, and demanding a website and a postcode
 * before the record can exist is how a directory ends up with three entries.
 */
export function CompanyForm({
  staff,
  defaultOwner,
}: {
  staff: { id: number; full_name: string }[];
  defaultOwner: number;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setError(t("form.required"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = (await response.json()) as { id?: number; error?: string };
      if (!response.ok || !data.id) {
        setError(t("common.error"));
        return;
      }
      router.push(`/companies/${data.id}`);
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

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={t("crm.newCompany")}
        action={
          <div className="flex gap-2">
            <Button href="/companies" variant="secondary">
              {t("ai.cancelEdit")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-2">
        <Panel title={t("crm.field.description")}>
          <div className="space-y-3 p-5">
            {label(
              `${t("form.title")} *`,
              <input name="name" required autoFocus className={FIELD} />,
            )}
            {label(
              t("crm.field.description"),
              <textarea name="description" rows={3} className={`${FIELD} resize-y`} />,
            )}
            {label(t("crm.field.industry"), <input name="industry" className={FIELD} />)}
            {label(t("crm.field.direction"), <input name="direction" className={FIELD} />)}
            {label(
              t("crm.field.services"),
              <textarea name="services" rows={3} className={`${FIELD} resize-y`} />,
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title={t("crm.tab.contacts")}>
            <div className="space-y-3 p-5">
              {label(t("crm.field.head"), <input name="head_name" className={FIELD} />)}
              {label(
                t("crm.field.headPosition"),
                <input name="head_position" className={FIELD} />,
              )}
              {label(t("crm.field.phone"), <input name="phone" className={FIELD} />)}
              {label(
                t("crm.field.email"),
                <input name="email" type="email" className={FIELD} />,
              )}
              {label(
                t("crm.field.website"),
                <input name="website" inputMode="url" className={FIELD} />,
              )}
            </div>
          </Panel>

          <Panel title={t("crm.field.status")}>
            <div className="space-y-3 p-5">
              {label(
                t("crm.field.status"),
                <Select name="status" defaultValue="POTENTIAL">
                  {["POTENTIAL", "ACTIVE", "PAUSED", "ARCHIVED"].map((value) => (
                    <option key={value} value={value}>
                      {t(`crm.status.${value}` as never)}
                    </option>
                  ))}
                </Select>,
              )}
              {label(
                t("crm.field.owner"),
                <Select name="owner_user_id" defaultValue={String(defaultOwner)}>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                    </option>
                  ))}
                </Select>,
              )}
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                {label(t("crm.field.started"), <DateField name="started_at" />)}
                {label(t("crm.field.nextContact"), <DateField name="next_contact_at" />)}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                {label(t("crm.field.country"), <input name="country" className={FIELD} />)}
                {label(t("crm.field.city"), <input name="city" className={FIELD} />)}
              </div>
              {label(t("crm.field.address"), <input name="address" className={FIELD} />)}
              {label(
                t("crm.field.notes"),
                <textarea name="notes" rows={3} className={`${FIELD} resize-y`} />,
              )}
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}
