import Link from "next/link";
import { redirect } from "next/navigation";
import { createTranslator, type MessageKey } from "@/lib/i18n";
import { currentLocale, requireUser } from "@/lib/session";
import { kpiBoard, kpiRollup, seesRollup, type GroupKpi } from "@/lib/kpi";
import { kpiSettings, kpiSettingsMeta } from "@/lib/settings";
import { seesEverything } from "@/lib/oversight";
import { isExternal } from "@/lib/types";
import { EmptyState, MetricStrip, PageHeader, Panel, TableWrap, Td, Th } from "@/components/ui";
import { readPeriod, periodQuery } from "./period";
import { PeriodSwitch, Pct, RagBadge } from "./kpi-ui";
import { KpiSettingsPanel } from "./kpi-settings";
import { KpiCard } from "./[userId]/card";

export const dynamic = "force-dynamic";

/**
 * KPI, TZ block 5. A member of staff sees his own card; a manager sees the
 * cards in his reach (TZ 4.2) with the roll-up — department, project,
 * cluster, ecosystem — red first, because red is what needs him.
 */
export default async function KpiPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; offset?: string }>;
}) {
  const user = await requireUser();
  if (isExternal(user.role)) redirect("/");
  const locale = await currentLocale(user);
  const t = createTranslator(locale);
  const bounds = readPeriod(await searchParams);

  const settings = await kpiSettings();
  const cards = await kpiBoard(user, bounds, settings);
  const rollup = seesRollup(user) ? await kpiRollup(user, cards, settings) : null;
  const meta = seesEverything(user) ? await kpiSettingsMeta() : null;

  // One person in reach, and it is oneself: the card is the page.
  if (!rollup && cards.length <= 1) {
    const own = cards[0];
    return (
      <>
        <PageHeader
          title={t("kpi.mine")}
          description={t("kpi.desc")}
          action={<PeriodSwitch bounds={bounds} t={t} />}
        />
        {own ? <KpiCard card={own} settings={settings} t={t} /> : <EmptyState text={t("kpi.noPeople")} icon="chart" />}
      </>
    );
  }

  const order = { RED: 0, AMBER: 1, GREEN: 2 } as const;
  const sorted = [...cards].sort((a, b) => {
    const ra = a.rag ? order[a.rag] : 3;
    const rb = b.rag ? order[b.rag] : 3;
    return ra - rb || (a.score ?? 101) - (b.score ?? 101) || a.full_name.localeCompare(b.full_name);
  });

  return (
    <>
      <PageHeader title={t("kpi.title")} description={t("kpi.desc")} action={<PeriodSwitch bounds={bounds} t={t} />} />

      {rollup && (
        <div className="mb-6">
          <MetricStrip
            items={[
              {
                label: t("kpi.ecosystem"),
                value: rollup.ecosystem.score === null ? "—" : `${rollup.ecosystem.score}%`,
                hint: `${rollup.ecosystem.people} ${t("kpi.peopleCount")}`,
              },
              {
                label: t("kpi.rag.RED"),
                value: rollup.ecosystem.red,
                hint: `${t("kpi.rag.AMBER")}: ${rollup.ecosystem.amber} · ${t("kpi.rag.GREEN")}: ${rollup.ecosystem.green}`,
              },
              {
                label: t("kpi.late"),
                value: rollup.ecosystem.lateShare === null ? "—" : `${rollup.ecosystem.lateShare}%`,
                hint: `${t("kpi.limit")} ${settings.limits.lateShare}%`,
              },
              {
                label: t("kpi.silent"),
                value: rollup.ecosystem.silentShare === null ? "—" : `${rollup.ecosystem.silentShare}%`,
                hint: `${t("kpi.limit")} ${settings.limits.silentShare}%`,
              },
            ]}
          />
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={t("kpi.people")}>
          {sorted.length === 0 ? (
            <EmptyState bare text={t("kpi.noPeople")} icon="chart" />
          ) : (
            <>
            {/* Under sm a table is a card list: four columns do not fit a
                phone, and a table scrolled inside its box hides the score. */}
            <ul className="divide-y sm:hidden">
              {sorted.map((card) => (
                <li key={card.id}>
                  <Link href={`/kpi/${card.id}${periodQuery(bounds)}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{card.full_name}</span>
                      <span className="muted block truncate text-[11px]">
                        {t(`role.${card.role}` as MessageKey)}
                        {card.department ? ` · ${card.department}` : ""}
                        {" · "}
                        {t("kpi.action")} <Pct value={card.actionScore} /> · {t("kpi.result")} <Pct value={card.resultScore} />
                      </span>
                    </span>
                    <span className="text-sm font-semibold"><Pct value={card.score} /></span>
                    <RagBadge rag={card.rag} t={t} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden sm:block">
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t("kpi.person")}</Th>
                  <Th numeric>{t("kpi.action")}</Th>
                  <Th numeric>{t("kpi.result")}</Th>
                  <Th numeric>{t("kpi.score")}</Th>
                  <Th>{t("kpi.settings.rag")}</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((card) => (
                  <tr key={card.id}>
                    <Td>
                      <Link href={`/kpi/${card.id}${periodQuery(bounds)}`} className="block min-w-0 hover:underline">
                        <span className="block truncate text-sm font-medium">{card.full_name}</span>
                        <span className="muted block truncate text-[11px]">
                          {t(`role.${card.role}` as MessageKey)}
                          {card.department ? ` · ${card.department}` : ""}
                        </span>
                      </Link>
                    </Td>
                    <Td numeric>
                      <Pct value={card.actionScore} />
                    </Td>
                    <Td numeric>
                      <Pct value={card.resultScore} />
                    </Td>
                    <Td numeric className="font-semibold">
                      <Pct value={card.score} />
                    </Td>
                    <Td>
                      <RagBadge rag={card.rag} t={t} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            </div>
            </>
          )}
        </Panel>

        {rollup && (
          <div className="space-y-6">
            <GroupPanel title={t("kpi.departments")} groups={rollup.departments} t={t} labelKey="dept" />
            <GroupPanel title={t("kpi.clusters")} groups={rollup.clusters} t={t} />
            <GroupPanel title={t("kpi.projects")} groups={rollup.projects} t={t} />
          </div>
        )}
      </div>

      {meta && (
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)]">
          <KpiSettingsPanel initial={settings} updatedBy={{ name: meta.updated_by_name, at: meta.updated_at }} />
        </div>
      )}
    </>
  );
}

/** A roll-up level: one line per group, score, light, and how many of each. */
function GroupPanel({
  title,
  groups,
  t,
  labelKey,
}: {
  title: string;
  groups: GroupKpi[];
  t: (key: MessageKey) => string;
  labelKey?: "dept";
}) {
  return (
    <Panel title={title}>
      {groups.length === 0 ? (
        <EmptyState bare text={t("common.noData")} icon="chart" />
      ) : (
        <ul className="divide-y">
          {groups.map((group) => (
            <li key={group.key} className="flex items-center gap-3 px-5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  {labelKey === "dept" ? t(`dept.${group.label}` as MessageKey).split(" — ")[0] : group.label}
                </span>
                <span className="muted block text-[11px] tabular-nums">
                  {group.people} {t("kpi.peopleCount")} · {t("kpi.rag.RED")} {group.red} · {t("kpi.rag.AMBER")} {group.amber} · {t("kpi.rag.GREEN")} {group.green}
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{group.score === null ? "—" : `${group.score}%`}</span>
              <RagBadge rag={group.rag} t={t} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
