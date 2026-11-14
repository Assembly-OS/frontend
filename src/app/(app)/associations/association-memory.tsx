"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { Button, FIELD, Panel } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Hit } from "@/lib/knowledge/retrieve";
import { KindBadge } from "../knowledge/status";

/**
 * The association's own memory (TZ 6.1 "uyushma xotirasi"): the same
 * permission-filtered retrieval the assistant uses, narrowed to records
 * about this association — its card, its meetings, its assignments, the
 * projects it takes part in. Nothing from outside its data space.
 */
export function AssociationMemory({ uyushmaId }: { uyushmaId: number }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function search() {
    const text = query.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(false);
    try {
      const url = new URL("/api/knowledge/search", window.location.origin);
      url.searchParams.set("q", text);
      url.searchParams.set("uyushma", String(uyushmaId));
      const response = await fetch(url);
      if (!response.ok) throw new Error("search");
      setHits(((await response.json()) as { hits: Hit[] }).hits);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={t("assoc.memory")}>
      <form
        className="flex items-end gap-2 p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">{t("knowledge.search.placeholder")}</span>
          <Icon name="search" className="muted pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("knowledge.search.placeholder")}
            className={`${FIELD} pl-9`}
          />
        </label>
        <Button type="submit" disabled={busy || !query.trim()}>
          {busy ? t("common.loading") : t("knowledge.search.button")}
        </Button>
      </form>

      {hits === null && !error ? (
        <p className="muted flex items-start gap-2 border-t px-5 py-3 text-[11px]">
          <Icon name="shield" className="mt-px size-3 shrink-0" aria-hidden />
          {t("assoc.memoryHint")}
        </p>
      ) : error ? (
        <p role="alert" className="border-t px-5 py-3 text-sm text-rose-600 dark:text-rose-400">
          {t("common.error")}
        </p>
      ) : hits && hits.length === 0 ? (
        <p className="muted border-t px-5 py-3 text-sm">{t("assoc.memoryEmpty")}</p>
      ) : (
        <ol className="divide-y border-t">
          {hits!.map((hit) => (
            <li key={hit.chunk_id} className="px-5 py-3.5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <KindBadge kind={hit.kind} />
                <Link href={hit.href} className="text-sm font-medium hover:underline [overflow-wrap:anywhere]">
                  {hit.title}
                </Link>
                <span className="muted text-[11px]">
                  {hit.occurred_at ? formatDate(hit.occurred_at) : ""}
                  {hit.author_name ? ` · ${hit.author_name}` : ""}
                  {hit.project_code ? ` · ${hit.project_code}` : ""}
                </span>
              </p>
              <p className="muted mt-1.5 border-l-2 pl-3 text-xs leading-relaxed [overflow-wrap:anywhere]">{hit.excerpt}</p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
