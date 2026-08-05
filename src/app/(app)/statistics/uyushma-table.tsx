"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { ProgressBar } from "@/components/ui";
import { formatMoney, formatNumber, percent } from "@/lib/format";
import type { UyushmaStat } from "@/lib/queries";

type SortKey = "name" | "members_count" | "projects" | "tasks_total" | "rate";

export function UyushmaTable({ rows }: { rows: UyushmaStat[] }) {
  const t = useT();
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState<SortKey>("rate");

  const data = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) =>
          [row.name, row.sector, row.region, row.head_name ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
      : rows;
    const rate = (row: UyushmaStat) => percent(row.tasks_done, row.tasks_total);
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "rate") return rate(b) - rate(a);
      return (b[sort] as number) - (a[sort] as number);
    });
  }, [rows, term, sort]);

  const columns: { key: SortKey; label: string; align?: string }[] = [
    { key: "name", label: t("stats.uyushma") },
    { key: "members_count", label: t("stats.members"), align: "text-right" },
    { key: "projects", label: t("stats.projects"), align: "text-right" },
    { key: "tasks_total", label: t("stats.tasks"), align: "text-right" },
    { key: "rate", label: t("stats.rate"), align: "text-right" },
  ];

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="relative min-w-56 flex-1">
          <Icon
            name="search"
            className="muted pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("common.search")}
            className="w-full rounded-xl border bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-navy-500"
          />
        </div>
        <span className="muted text-xs font-medium">
          {data.length} / {rows.length}
        </span>
      </div>

      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide ${
                    column.align ?? ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSort(column.key)}
                    className={`transition hover:opacity-70 ${
                      sort === column.key ? "text-navy-600 dark:text-navy-300" : "muted"
                    }`}
                  >
                    {column.label}
                    {sort === column.key ? " ↓" : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => {
              const rate = percent(row.tasks_done, row.tasks_total);
              return (
                <tr key={row.id} className="hover:bg-[var(--surface)]">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.name}</p>
                    <p className="muted mt-0.5 text-xs">
                      {row.sector} · {row.region}
                      {row.head_login && (
                        <>
                          {" · "}
                          <Link
                            href={`/chat/${row.head_login}`}
                            className="font-mono hover:underline"
                          >
                            @{row.head_login}
                          </Link>
                        </>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatNumber(row.members_count)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold">{row.projects}</span>
                    {row.budget > 0 && (
                      <span className="muted block text-[11px]">
                        {formatMoney(row.budget, t)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold">{row.tasks_total}</span>
                    <span className="muted block text-[11px]">
                      {t("stats.active")}: {row.tasks_active}
                      {row.tasks_overdue > 0 && (
                        <span className="text-rose-600 dark:text-rose-400">
                          {" "}
                          · {row.tasks_overdue} ⚠
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="ml-auto w-28">
                      <div className="mb-1 text-right text-xs font-bold">
                        {rate}%
                      </div>
                      <ProgressBar
                        value={rate}
                        tone={
                          rate >= 60
                            ? "bg-emerald-500"
                            : rate >= 30
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
