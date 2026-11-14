"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { Panel } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { HistoryItem } from "@/lib/knowledge/retrieve";
import type { MessageKey } from "@/lib/i18n";

/**
 * The historical reminder, TZ 7.4. Mounted on the forms that start a new
 * record — a meeting, an agreement — it asks the memory, unprompted, what
 * is already known about the company, association or project chosen and
 * about the title typed, and says it in one line each: when, with whom,
 * what was agreed, where it stands, and the source. Silent while nothing
 * is chosen; "no earlier record" when the memory has none.
 */
export function HistoryNotice({
  companyId,
  uyushmaId,
  projectId,
  text,
}: {
  companyId?: number | null;
  uyushmaId?: number | null;
  projectId?: number | null;
  text?: string | null;
}) {
  const t = useT();
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const query = text?.trim() ?? "";
  const asked = Boolean(companyId || uyushmaId || projectId || query.length >= 3);

  useEffect(() => {
    // Nothing chosen yet: nothing to ask, and nothing is rendered below.
    if (!asked) return;
    const controller = new AbortController();
    // Debounced: a title is typed a letter at a time.
    const timer = window.setTimeout(async () => {
      try {
        const url = new URL("/api/knowledge/related", window.location.origin);
        if (companyId) url.searchParams.set("company", String(companyId));
        if (uyushmaId) url.searchParams.set("uyushma", String(uyushmaId));
        if (projectId) url.searchParams.set("project", String(projectId));
        if (query.length >= 3) url.searchParams.set("q", query);
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("related");
        setItems(((await response.json()) as { items: HistoryItem[] }).items);
      } catch {
        if (!controller.signal.aborted) setItems([]);
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [asked, companyId, uyushmaId, projectId, query]);

  if (!asked || items === null) return null;

  return (
    <Panel title={t("history.title")} className="mb-6">
      {items.length === 0 ? (
        <p className="muted px-5 py-3 text-xs">{t("history.empty")}</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.source_id} className="px-5 py-2.5 text-xs">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="muted tabular-nums">{item.occurred_at ? formatDate(item.occurred_at) : "—"}</span>
                <span className="muted">{t(`knowledge.kind.${item.kind}` as MessageKey)}</span>
                {item.who && (
                  <span>
                    <span className="muted">{t("history.with")}:</span> {item.who}
                  </span>
                )}
                <Link href={item.href} className="ml-auto inline-flex items-center gap-1 font-medium hover:underline">
                  {item.title.length > 60 ? `${item.title.slice(0, 60)}…` : item.title}
                  <Icon name="arrow" className="size-3" aria-hidden />
                </Link>
              </p>
              {(item.agreed || item.status || item.excerpt) && (
                <p className="muted mt-0.5 [overflow-wrap:anywhere]">
                  {item.agreed && (
                    <span>
                      {t("history.agreed")}: {item.agreed}
                    </span>
                  )}
                  {item.agreed && item.status ? " · " : ""}
                  {item.status && (
                    <span>
                      {t("history.now")}: {item.status}
                    </span>
                  )}
                  {!item.agreed && !item.status && item.excerpt}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="muted flex items-start gap-2 border-t px-5 py-2 text-[11px]">
        <Icon name="shield" className="mt-px size-3 shrink-0" aria-hidden />
        {t("history.hint")}
      </p>
    </Panel>
  );
}
