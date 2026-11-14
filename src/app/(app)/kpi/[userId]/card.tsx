import type { Translator, MessageKey } from "@/lib/i18n";
import type { PersonKpi } from "@/lib/kpi";
import { ACTION_KEYS, fractionPercent, TARGET_KEYS, type KpiSettings } from "@/lib/kpi-rules";
import { Panel } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { Pct, RagBadge } from "../kpi-ui";

/**
 * One person's card with the formula open (TZ 5: "formula foydalanuvchiga
 * ko'rinadi — yopiq hisob bo'lmaydi"). Every component shows what was
 * counted over what, and the total shows the ratio that weighed the halves.
 */
export function KpiCard({ card, settings, t }: { card: PersonKpi; settings: KpiSettings; t: Translator }) {
  void settings;
  const total = t("kpi.formula.total").replace("{a}", String(card.ratio.action)).replace("{r}", String(card.ratio.result));
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{card.full_name}</p>
            <p className="muted text-xs">
              {t(`role.${card.role}` as MessageKey)}
              {card.department ? ` · ${card.department}` : ""}
            </p>
          </div>
          <dl className="flex items-baseline gap-6">
            <div>
              <dd className="text-2xl font-bold leading-none tabular-nums">{card.actionScore === null ? "—" : `${card.actionScore}%`}</dd>
              <dt className="muted mt-1 text-[11px]">{t("kpi.action")} · {card.ratio.action}%</dt>
            </div>
            <div>
              <dd className="text-2xl font-bold leading-none tabular-nums">{card.resultScore === null ? "—" : `${card.resultScore}%`}</dd>
              <dt className="muted mt-1 text-[11px]">{t("kpi.result")} · {card.ratio.result}%</dt>
            </div>
            <div>
              <dd className="text-2xl font-bold leading-none tabular-nums">{card.score === null ? "—" : `${card.score}%`}</dd>
              <dt className="muted mt-1 text-[11px]">{t("kpi.score")}</dt>
            </div>
          </dl>
          <RagBadge rag={card.rag} t={t} />
        </div>
        <p className="muted border-t px-5 py-3 text-xs">
          <span className="font-semibold">{t("kpi.formula")}:</span> {total}. {t("kpi.formula.action")}. {t("kpi.formula.result")}.
          {card.resultScore === null ? ` ${t("kpi.noResult")}.` : ""}
        </p>
      </Panel>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-2">
        <Panel title={t("kpi.action")}>
          <ul className="divide-y">
            {ACTION_KEYS.map((key) => {
              const fraction = card.action[key];
              const value = fractionPercent(fraction);
              return (
                <li key={key} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 text-sm">{t(`kpi.comp.${key}` as MessageKey)}</span>
                    <span className="muted text-xs tabular-nums">
                      {fraction.total > 0 ? `${fraction.good} / ${fraction.total}` : t("kpi.notApplicable")}
                    </span>
                    <span className="w-12 text-right text-sm font-semibold">
                      <Pct value={value} />
                    </span>
                  </div>
                  <p className="muted mt-1 text-[11px] leading-snug">{t(`kpi.comp.${key}.how` as MessageKey)}</p>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title={t("kpi.result")}>
          <ul className="divide-y">
            {TARGET_KEYS.map((key) => {
              const target = card.targets[key];
              const actual = card.actuals[key];
              const share = target > 0 ? Math.min(100, Math.round((100 * actual) / target)) : null;
              return (
                <li key={key} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1 text-sm">{t(`kpi.res.${key}` as MessageKey)}</span>
                  <span className="muted text-xs tabular-nums">
                    {t("kpi.actual")} {actual}
                    {target > 0 ? ` · ${t("kpi.target")} ${target}` : ""}
                  </span>
                  <span className="w-12 text-right text-sm font-semibold">
                    <Pct value={share} />
                  </span>
                </li>
              );
            })}
            {card.capital.length > 0 && (
              <li className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 text-sm">{t("kpi.capital")}</span>
                <span className="text-xs tabular-nums">
                  {card.capital.map((item) => `${formatNumber(item.amount)} ${item.currency}`).join(" · ")}
                </span>
              </li>
            )}
            {card.goals.map((goal) => {
              const share = Math.min(100, Math.round((100 * Math.max(0, goal.latest ?? 0)) / goal.target));
              return (
                <li key={goal.taskId} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      <span className="muted font-mono text-[11px]">{goal.code}</span> {goal.title}
                    </span>
                    <span className="muted block text-[11px]">{t("kpi.goals")}</span>
                  </span>
                  <span className="muted text-xs tabular-nums">
                    {t("kpi.goal.latest")} {goal.latest ?? 0} / {goal.target} {goal.unit ?? ""}
                  </span>
                  <span className="w-12 text-right text-sm font-semibold">
                    <Pct value={share} />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="muted border-t px-5 py-3 text-[11px]">{t("kpi.res.how")}</p>
        </Panel>
      </div>
    </div>
  );
}
