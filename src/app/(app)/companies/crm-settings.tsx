"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, FIELD, Panel } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import { STAGES, type Stage } from "@/lib/crm-stages";

/**
 * How long a company may sit at each stage before the card, the list and
 * the owner's notification call it stuck (TZ 6.2 "Qotib qolgan"). One row
 * per stage, days; 0 switches the alarm off for that stage. The server
 * clamps every number, so what comes back is what is stored.
 */
export function CrmSettingsPanel({ initial }: { initial: Record<Stage, number> }) {
  const t = useT();
  const router = useRouter();
  const [limits, setLimits] = useState<Record<Stage, number>>(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  async function save() {
    setState("busy");
    try {
      const response = await fetch("/api/settings/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageLimits: limits }),
      });
      if (!response.ok) throw new Error("save");
      const data = (await response.json()) as { stageLimits: Record<Stage, number> };
      setLimits(data.stageLimits);
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <Panel
      title={t("crm.settings.title")}
      action={
        <Button size="sm" disabled={state === "busy"} onClick={() => void save()}>
          {state === "saved" ? t("common.saved") : t("common.save")}
        </Button>
      }
    >
      <p className="muted border-b px-5 py-3 text-xs">{t("crm.settings.hint")}</p>
      <ul className="grid gap-x-6 gap-y-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {STAGES.map((stage, index) => (
          <li key={stage}>
            <label className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0">
                <span className="muted tabular-nums">{index + 1}.</span>{" "}
                {t(`crm.stage.${stage}` as MessageKey)}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <input
                  className={`${FIELD} w-20 px-2 py-1 text-right text-xs tabular-nums`}
                  type="number"
                  min={0}
                  max={3650}
                  value={limits[stage]}
                  onChange={(e) =>
                    setLimits({
                      ...limits,
                      [stage]: Math.max(0, Math.min(3650, Math.round(Number(e.target.value) || 0))),
                    })
                  }
                />
                <span className="muted">{t("crm.limitDays")}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {state === "error" && (
        <p role="alert" className="border-t px-5 py-3 text-xs text-rose-600 dark:text-rose-400">
          {t("common.error")}
        </p>
      )}
    </Panel>
  );
}
