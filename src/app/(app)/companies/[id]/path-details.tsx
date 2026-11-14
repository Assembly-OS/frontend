"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, DateField, FIELD, Panel, Select } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import { VERIFICATIONS, type Verification } from "@/lib/crm-stages";

export interface PathDetailValues {
  deal_value: number | null;
  deal_currency: string | null;
  next_step: string | null;
  next_step_on: string | null;
  verification: Verification;
  uyushma_id: number | null;
}

/**
 * The fields TZ 6.2 adds to a company beside its stage: the deal's value,
 * the next step and its date, whether the company has been checked, and
 * the association it belongs to. Edited in place on the card — the person
 * reading the card is the one who knows the next step.
 */
export function PathDetails({
  companyId,
  values,
  associations,
  writable,
}: {
  companyId: number;
  values: PathDetailValues;
  associations: { id: number; name: string }[];
  writable: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("busy");
    try {
      const response = await fetch(`/api/crm/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_value: String(form.get("deal_value") ?? ""),
          deal_currency: String(form.get("deal_currency") ?? "").trim() || null,
          next_step: String(form.get("next_step") ?? "").trim() || null,
          next_step_on: String(form.get("next_step_on") ?? "") || null,
          verification: String(form.get("verification") ?? "NOT_CHECKED"),
          uyushma_id: String(form.get("uyushma_id") ?? "") || null,
        }),
      });
      if (!response.ok) throw new Error("save");
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  const label = (text: string, control: React.ReactNode) => (
    <label className="block">
      <span className="muted mb-1 block text-xs font-medium">{text}</span>
      {control}
    </label>
  );

  return (
    <Panel title={t("crm.pathDetails")}>
      <form className="space-y-3 p-5" onSubmit={save}>
        <fieldset disabled={!writable} className="space-y-3">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
            {label(
              t("crm.field.dealValue"),
              <input
                name="deal_value"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                defaultValue={values.deal_value ?? ""}
                className={`${FIELD} tabular-nums`}
              />,
            )}
            {label(
              t("crm.field.currency"),
              <input name="deal_currency" maxLength={8} defaultValue={values.deal_currency ?? ""} className={FIELD} />,
            )}
          </div>
          {label(
            t("crm.field.nextStep"),
            <input name="next_step" maxLength={300} defaultValue={values.next_step ?? ""} className={FIELD} />,
          )}
          {label(
            t("crm.field.nextStepOn"),
            <DateField name="next_step_on" defaultValue={values.next_step_on?.slice(0, 10) ?? ""} />,
          )}
          {label(
            t("crm.field.verification"),
            <Select name="verification" defaultValue={values.verification}>
              {VERIFICATIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`crm.verification.${value}` as MessageKey)}
                </option>
              ))}
            </Select>,
          )}
          {label(
            t("crm.field.association"),
            <Select name="uyushma_id" defaultValue={values.uyushma_id ?? ""}>
              <option value="">—</option>
              {associations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>,
          )}
        </fieldset>
        {writable && (
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={state === "busy"}>
              {state === "saved" ? t("common.saved") : t("common.save")}
            </Button>
            {state === "error" && (
              <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                {t("common.error")}
              </p>
            )}
          </div>
        )}
      </form>
    </Panel>
  );
}
