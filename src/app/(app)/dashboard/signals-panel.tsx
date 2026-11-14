import Link from "next/link";
import type { Translator, MessageKey } from "@/lib/i18n";
import type { User } from "@/lib/types";
import { Panel } from "@/components/ui";
import { signals } from "@/lib/signals";

/**
 * The six signals of TZ 7.5, as rows: each a count, the first few names,
 * and a link to where the rest are. Rules over the records — they work on
 * day one, with no model behind them.
 */
export async function SignalsPanel({ user, t }: { user: User; t: Translator }) {
  const s = await signals(user);
  const rows: { key: MessageKey; count: number; href: string; names: { label: string; href?: string; hint?: string }[] }[] = [
    {
      key: "signals.inactive",
      count: s.inactive.length,
      href: "/projects",
      names: s.inactive.slice(0, 4).map((p) => ({ label: p.code, href: `/projects/${p.id}`, hint: t("signals.daysQuiet").replace("{n}", String(p.daysQuiet)) })),
    },
    { key: "signals.silent", count: s.silentTasks, href: "/tasks/review", names: [] },
    {
      key: "signals.stuck",
      count: s.stuck.length,
      href: "/companies?stuck=1",
      names: s.stuck.slice(0, 4).map((c) => ({ label: c.name, href: `/companies/${c.id}`, hint: `${c.days} ${t("crm.daysInStage")}` })),
    },
    {
      key: "signals.overload",
      count: s.overloaded.length,
      href: "/projects",
      names: s.overloaded.slice(0, 4).map((lead) => ({ label: lead.full_name, hint: t("signals.leads").replace("{n}", String(lead.projects.length)) })),
    },
    {
      key: "signals.passport",
      count: s.incompletePassports.length,
      href: "/projects",
      names: s.incompletePassports.slice(0, 4).map((p) => ({ label: p.code, href: `/projects/${p.id}` })),
    },
    {
      key: "signals.kontur",
      count: s.kontur.filter((k) => k.low).length,
      href: "/statistics",
      names: s.kontur
        .filter((k) => k.low)
        .map((k) => ({ label: t("signals.konturLine").replace("{dept}", k.department).replace("{share}", String(k.share)) })),
    },
  ];
  const any = rows.some((row) => row.count > 0);

  return (
    <Panel title={t("signals.title")}>
      <p className="muted border-b px-5 py-2 text-[11px]">{t("signals.hint")}</p>
      {!any ? (
        <p className="muted px-5 py-6 text-center text-sm">{t("signals.none")}</p>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.key} className="flex items-start gap-3 px-5 py-2.5">
              <span
                className={`w-8 shrink-0 text-lg font-bold leading-none tabular-nums ${
                  row.count > 0 ? "text-rose-700 dark:text-rose-300" : "muted"
                }`}
              >
                {row.count}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={row.href} className="text-sm font-medium hover:underline">
                  {t(row.key)}
                </Link>
                {row.names.length > 0 && (
                  <p className="muted mt-0.5 text-xs [overflow-wrap:anywhere]">
                    {row.names.map((n, i) => (
                      <span key={i}>
                        {i > 0 ? " · " : ""}
                        {n.href ? (
                          <Link href={n.href} className="hover:underline">
                            {n.label}
                          </Link>
                        ) : (
                          n.label
                        )}
                        {n.hint ? ` (${n.hint})` : ""}
                      </span>
                    ))}
                    {row.count > row.names.length && row.names.length > 0 ? " …" : ""}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
