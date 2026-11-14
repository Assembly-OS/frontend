import Link from "next/link";
import type { Translator, MessageKey } from "@/lib/i18n";
import type { User } from "@/lib/types";
import { Badge, EmptyState, Panel } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { inLocale, clusterName } from "@/lib/project-passport";
import { monthBounds } from "@/lib/reports";
import {
  clusterHealth,
  interventions,
  periodResults,
  projectHealth,
  upcomingDecisions,
  type ProjectHealth,
} from "@/lib/signals";
import { RAG_TONE } from "./tone";

/**
 * The chairman's home page, TZ 8.4: four blocks and nothing else. What
 * needs him, the clusters' colour, what the month produced, what is due.
 * A project running normally is not on this screen — he reads five to
 * seven matters, not a hundred.
 */
export async function ChairmanHome({ user, t, locale }: { user: User; t: Translator; locale: string }) {
  const health = await projectHealth(user);
  const needs = interventions(health).slice(0, 12);
  const clusters = await clusterHealth(health);
  const month = monthBounds(0);
  const results = await periodResults(month.from, month.to);
  const upcoming = upcomingDecisions(health, 14).slice(0, 10);
  const name = (p: ProjectHealth) => inLocale(locale, p.name, p.name_ru, p.name_en) ?? p.name;
  const flags = (p: ProjectHealth) =>
    (Object.keys(p.flags) as (keyof ProjectHealth["flags"])[])
      .filter((key) => p.flags[key])
      .map((key) => t(`home.flag.${key}` as MessageKey));

  return (
    <section className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-2">
      <Panel title={t("home.intervene")} action={<span className="muted text-xs tabular-nums">{needs.length}</span>}>
        {needs.length === 0 ? (
          <EmptyState bare text={t("home.quiet")} hint={t("home.intervene.hint")} icon="check" />
        ) : (
          <ul className="divide-y">
            {needs.map((p) => (
              <li key={p.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={RAG_TONE[p.rag]}>{t(`home.rag.${p.rag}` as MessageKey)}</Badge>
                  <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
                    <span className="muted mr-2 font-mono text-xs">{p.code}</span>
                    {name(p)}
                  </Link>
                  {p.daysQuiet > 0 && (
                    <span className="muted text-[11px] tabular-nums">{t("signals.daysQuiet").replace("{n}", String(p.daysQuiet))}</span>
                  )}
                </div>
                <p className="muted mt-1 text-xs">
                  {flags(p).join(" · ")}
                  {p.owner_name || p.leader_name ? ` · ${p.owner_name ?? p.leader_name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t("home.clusters")}>
        <p className="muted border-b px-5 py-2 text-[11px]">{t("home.clusters.hint")}</p>
        <ul className="divide-y">
          {clusters.map((c) => {
            const label = c.id === null ? t("home.unassigned") : (clusterName(locale, { uz: c.name_uz, uzc: c.name_uzc, ru: c.name_ru, en: c.name_en }) ?? c.code);
            const total = Math.max(1, c.total);
            return (
              <li key={c.code} className="px-5 py-2.5">
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm">{label}</p>
                  {c.alarm && <Badge className={RAG_TONE.RED}>{t("home.alarm")}</Badge>}
                  <p className="muted shrink-0 text-[11px] tabular-nums">
                    <span className="text-emerald-700 dark:text-emerald-300">{c.green}</span> ·{" "}
                    <span className="text-amber-700 dark:text-amber-300">{c.amber}</span> ·{" "}
                    <span className="text-rose-700 dark:text-rose-300">{c.red}</span>
                  </p>
                </div>
                {/* One bar, three shares: the colour says the state, the width the count. */}
                <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden>
                  <span className="bg-emerald-500" style={{ width: `${(c.green / total) * 100}%` }} />
                  <span className="bg-amber-500" style={{ width: `${(c.amber / total) * 100}%` }} />
                  <span className="bg-rose-500" style={{ width: `${(c.red / total) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel
        title={t("home.results")}
        action={
          <span className="muted text-[11px] tabular-nums">
            {formatDate(month.from)} – {formatDate(month.to)}
          </span>
        }
      >
        {/* Labels wrap rather than truncate: Uzbek and Russian are long, and a
            figure whose label is cut off is a figure without a meaning. */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-4 sm:grid-cols-3">
          {(
            [
              [t("home.results.agreements"), String(results.agreements), "/agreements"],
              [
                t("home.results.capital"),
                results.amounts.length ? results.amounts.map((a) => `${formatNumber(a.amount)} ${a.currency}`).join(" · ") : "0",
                null,
              ],
              [t("home.results.partners"), String(results.newPartners), "/companies?stage=ACTIVE"],
              [t("home.results.companies"), String(results.newCompanies), "/companies"],
              [t("home.results.meetings"), String(results.meetings), "/meetings"],
              [t("home.results.tasksDone"), String(results.tasksDone), null],
            ] as [string, string, string | null][]
          ).map(([label, value, href]) => (
            <div key={label} className="min-w-0">
              <dd className="text-lg font-bold leading-none tracking-tight tabular-nums [overflow-wrap:anywhere]">
                {href ? (
                  <Link href={href} className="hover:underline">
                    {value}
                  </Link>
                ) : (
                  value
                )}
              </dd>
              <dt className="muted mt-1.5 text-xs font-medium">{label}</dt>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title={t("home.upcoming")} action={<span className="muted text-xs tabular-nums">{upcoming.length}</span>}>
        {upcoming.length === 0 ? (
          <EmptyState bare text={t("home.noDecisions")} hint={t("home.upcoming.hint")} icon="calendar" />
        ) : (
          <ul className="divide-y">
            {upcoming.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
                <span className={`shrink-0 text-xs tabular-nums ${p.overdue ? "font-semibold text-rose-700 dark:text-rose-300" : "muted"}`}>
                  {formatDate(p.dueOn)}
                </span>
                <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                  <span className="muted mr-2 font-mono text-xs">{p.code}</span>
                  {name(p)}
                </Link>
                {p.phase && <span className="muted shrink-0 text-[11px]">{t(`proj.phase.${p.phase}` as MessageKey)}</span>}
                {p.tier && <span className="muted shrink-0 text-[11px]">{t(`proj.tier.${p.tier}` as MessageKey)}</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </section>
  );
}
