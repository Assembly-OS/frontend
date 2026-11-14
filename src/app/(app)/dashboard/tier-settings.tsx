"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, FIELD, Panel, TableWrap, Td, Th } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";
import { TIERS } from "@/lib/project-passport";
import type { SignalSettings, TierSettings } from "@/lib/signal-rules";

/**
 * TZ 8.2 and 7.5 in one panel: how often each tier is reviewed and how much
 * red a cluster may carry at it, and the thresholds behind the signals.
 * The chairman's side only; the server clamps every number.
 */
export function TierSettingsPanel({ tiers: initialTiers, signals: initialSignals }: { tiers: TierSettings; signals: SignalSettings }) {
  const t = useT();
  const router = useRouter();
  const [tiers, setTiers] = useState<TierSettings>(initialTiers);
  const [signals, setSignals] = useState<SignalSettings>(initialSignals);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const number = (value: string, max: number, min = 0) => Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
  const input = `${FIELD} w-20 px-2 py-1 text-right text-xs tabular-nums`;

  async function save() {
    setState("busy");
    try {
      const response = await fetch("/api/settings/tiers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers, signals }),
      });
      if (!response.ok) throw new Error("save");
      const data = (await response.json()) as { tiers: TierSettings; signals: SignalSettings };
      setTiers(data.tiers);
      setSignals(data.signals);
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <Panel
      title={t("tiers.title")}
      action={
        <Button size="sm" disabled={state === "busy"} onClick={() => void save()}>
          {state === "saved" ? t("common.saved") : t("common.save")}
        </Button>
      }
    >
      <p className="muted border-b px-5 py-3 text-xs">{t("tiers.hint")}</p>
      <TableWrap>
        <thead>
          <tr>
            <Th>{t("proj.field.tier")}</Th>
            <Th numeric>{t("tiers.reviewDays")}</Th>
            <Th numeric>{t("tiers.redShareMax")}</Th>
            <Th numeric>{t("tiers.inactiveDays")}</Th>
          </tr>
        </thead>
        <tbody>
          {TIERS.map((tier) => (
            <tr key={tier}>
              <Td>{t(`proj.tier.${tier}` as MessageKey)}</Td>
              <Td numeric>
                <input
                  className={input}
                  type="number"
                  min={1}
                  max={365}
                  value={tiers[tier].reviewDays}
                  onChange={(e) => setTiers({ ...tiers, [tier]: { ...tiers[tier], reviewDays: number(e.target.value, 365, 1) } })}
                />
              </Td>
              <Td numeric>
                <input
                  className={input}
                  type="number"
                  min={0}
                  max={100}
                  value={tiers[tier].redShareMax}
                  onChange={(e) => setTiers({ ...tiers, [tier]: { ...tiers[tier], redShareMax: number(e.target.value, 100) } })}
                />
              </Td>
              <Td numeric>
                <input
                  className={input}
                  type="number"
                  min={1}
                  max={365}
                  value={signals.inactiveDays[tier]}
                  onChange={(e) =>
                    setSignals({ ...signals, inactiveDays: { ...signals.inactiveDays, [tier]: number(e.target.value, 365, 1) } })
                  }
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <div className="grid gap-3 border-t p-5 sm:grid-cols-3">
        {(
          [
            ["konturMinShare", 100],
            ["overloadProjects", 20],
            ["redTaskShare", 100],
          ] as const
        ).map(([key, max]) => (
          <label key={key} className="flex items-center justify-between gap-3 text-xs">
            <span>{t(`tiers.${key}` as MessageKey)}</span>
            <input
              className={input}
              type="number"
              min={key === "konturMinShare" ? 0 : 1}
              max={max}
              value={signals[key]}
              onChange={(e) => setSignals({ ...signals, [key]: number(e.target.value, max, key === "konturMinShare" ? 0 : 1) })}
            />
          </label>
        ))}
      </div>
      {state === "error" && (
        <p role="alert" className="border-t px-5 py-3 text-xs text-rose-600 dark:text-rose-400">
          {t("common.error")}
        </p>
      )}
    </Panel>
  );
}
