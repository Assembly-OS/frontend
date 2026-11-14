"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, FIELD, Panel, TableWrap, Td, Th } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import { TARGET_KEYS, type KpiSettings } from "@/lib/kpi-rules";
import { EXTERNAL_ROLES, ROLES, type Role } from "@/lib/types";

/** Roles that are scored: the staff, not the chairman, not outsiders. */
const SCORED = ROLES.filter((role) => role !== "RAIS" && !EXTERNAL_ROLES.includes(role));

/**
 * The chairman's knobs (TZ 5.2 "nisbatlar sozlamalarda o'zgartiriladi"):
 * the ratio per role, the traffic-light thresholds, the two limits, and the
 * monthly result targets. The result share is derived, so the two always
 * sum to 100. Saved as one document; the server checks every number.
 */
export function KpiSettingsPanel({
  initial,
  updatedBy,
}: {
  initial: KpiSettings;
  updatedBy: { name: string | null; at: string | null };
}) {
  const t = useT();
  const router = useRouter();
  const [settings, setSettings] = useState<KpiSettings>(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  const number = (value: string, max = 100) => Math.max(0, Math.min(max, Math.round(Number(value) || 0)));

  async function save() {
    setState("busy");
    try {
      const response = await fetch("/api/settings/kpi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("save");
      const data = (await response.json()) as { settings: KpiSettings };
      setSettings(data.settings);
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  const input = `${FIELD} w-20 px-2 py-1 text-right text-xs tabular-nums`;

  return (
    <Panel
      title={t("kpi.settings.title")}
      action={
        <Button size="sm" disabled={state === "busy"} onClick={() => void save()}>
          {state === "saved" ? t("kpi.settings.saved") : t("kpi.settings.save")}
        </Button>
      }
    >
      <p className="muted border-b px-5 py-3 text-xs">
        {t("kpi.settings.hint")}
        {updatedBy.name ? ` · ${t("kpi.settings.updatedBy")}: ${updatedBy.name}` : ""}
      </p>

      <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold">{t("kpi.settings.rag")}</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-xs">
              {t("kpi.settings.green")}
              <input
                className={input}
                type="number"
                min={0}
                max={100}
                value={settings.rag.green}
                onChange={(e) => setSettings({ ...settings, rag: { ...settings.rag, green: number(e.target.value) } })}
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              {t("kpi.settings.amber")}
              <input
                className={input}
                type="number"
                min={0}
                max={100}
                value={settings.rag.amber}
                onChange={(e) => setSettings({ ...settings, rag: { ...settings.rag, amber: number(e.target.value) } })}
              />
            </label>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold">{t("kpi.settings.limits")}</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-xs">
              {t("kpi.settings.lateShare")}
              <input
                className={input}
                type="number"
                min={0}
                max={100}
                value={settings.limits.lateShare}
                onChange={(e) =>
                  setSettings({ ...settings, limits: { ...settings.limits, lateShare: number(e.target.value) } })
                }
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              {t("kpi.settings.silentShare")}
              <input
                className={input}
                type="number"
                min={0}
                max={100}
                value={settings.limits.silentShare}
                onChange={(e) =>
                  setSettings({ ...settings, limits: { ...settings.limits, silentShare: number(e.target.value) } })
                }
              />
            </label>
          </div>
        </div>
      </div>

      <p className="border-t px-5 pt-4 text-xs font-semibold">{t("kpi.settings.ratios")} · {t("kpi.settings.targets")}</p>
      <TableWrap>
        <thead>
          <tr>
            <Th>{t("profile.role")}</Th>
            <Th numeric>{t("kpi.settings.actionShare")}</Th>
            <Th numeric>{t("kpi.result")} %</Th>
            {TARGET_KEYS.map((key) => (
              <Th key={key} numeric>
                {t(`kpi.res.${key}` as MessageKey)}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCORED.map((role: Role) => (
            <tr key={role}>
              <Td>{t(`role.${role}` as MessageKey)}</Td>
              <Td numeric>
                <input
                  className={input}
                  type="number"
                  min={0}
                  max={100}
                  value={settings.ratios[role].action}
                  onChange={(e) => {
                    const action = number(e.target.value);
                    setSettings({
                      ...settings,
                      ratios: { ...settings.ratios, [role]: { action, result: 100 - action } },
                    });
                  }}
                />
              </Td>
              <Td numeric>{settings.ratios[role].result}</Td>
              {TARGET_KEYS.map((key) => (
                <Td key={key} numeric>
                  <input
                    className={input}
                    type="number"
                    min={0}
                    max={1000}
                    value={settings.targets[role][key]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        targets: {
                          ...settings.targets,
                          [role]: { ...settings.targets[role], [key]: number(e.target.value, 1000) },
                        },
                      })
                    }
                  />
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {state === "error" && (
        <p role="alert" className="px-5 py-3 text-xs text-rose-600 dark:text-rose-400">
          {t("common.error")}
        </p>
      )}
    </Panel>
  );
}
