"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, FIELD, Panel, Select } from "@/components/ui";
import { SEVERITIES, type AiSettings } from "@/lib/signal-rules";

/**
 * The queue's two switches (TZ 7.1): whether low-risk proposals turn into
 * records on their own, and up to which importance; and after how many
 * days an unread proposal is archived. The chairman's side only.
 */
export function AiSettingsPanel({ initial }: { initial: AiSettings }) {
  const t = useT();
  const router = useRouter();
  const [settings, setSettings] = useState<AiSettings>(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  async function save() {
    setState("busy");
    try {
      const response = await fetch("/api/settings/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("save");
      setSettings(((await response.json()) as { settings: AiSettings }).settings);
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <Panel
      title={t("ai.settings.title")}
      action={
        <Button size="sm" disabled={state === "busy"} onClick={() => void save()}>
          {state === "saved" ? t("common.saved") : t("common.save")}
        </Button>
      }
    >
      <p className="muted border-b px-5 py-3 text-xs">{t("ai.settings.hint")}</p>
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <label className="flex min-h-10 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.autoApprove}
            onChange={(e) => setSettings({ ...settings, autoApprove: e.target.checked })}
          />
          {t("ai.settings.autoApprove")}
        </label>
        <label className="block">
          <span className="muted mb-1 block text-xs font-medium">{t("ai.settings.maxSeverity")}</span>
          <Select
            value={settings.autoApproveMaxSeverity}
            disabled={!settings.autoApprove}
            onChange={(e) => setSettings({ ...settings, autoApproveMaxSeverity: e.target.value as AiSettings["autoApproveMaxSeverity"] })}
          >
            {SEVERITIES.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="muted mb-1 block text-xs font-medium">{t("ai.settings.expireDays")}</span>
          <input
            className={`${FIELD} tabular-nums`}
            type="number"
            min={1}
            max={365}
            value={settings.expireDays}
            onChange={(e) => setSettings({ ...settings, expireDays: Math.max(1, Math.min(365, Math.round(Number(e.target.value) || 1))) })}
          />
        </label>
      </div>
      {state === "error" && (
        <p role="alert" className="border-t px-5 py-3 text-xs text-rose-600 dark:text-rose-400">
          {t("common.error")}
        </p>
      )}
    </Panel>
  );
}
