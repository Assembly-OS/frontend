"use client";

import { useId, useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { FIELD } from "@/components/ui";

/**
 * Pick several from a list: checkboxes, with a filter once the list is long.
 *
 * A native `<select multiple>` was the other option and the wrong one on a
 * desk — it needs a held Ctrl to pick a second item, and one plain click
 * silently drops every earlier choice. Checkboxes say what is chosen and stay
 * chosen. The boxes are real form inputs named `name`, so the surrounding form
 * reads them with `FormData.getAll` and needs no state of its own.
 *
 * The filter only hides rows; a chosen item that the filter hides is still
 * chosen and still submitted. The count beside the label says so, so a filter
 * never makes a choice look lost.
 */
export function CheckList({
  name,
  label,
  items,
  initial = [],
}: {
  name: string;
  label: string;
  items: { id: number; label: string; hint?: string | null }[];
  initial?: number[];
}) {
  const t = useT();
  const id = useId();
  const [chosen, setChosen] = useState<Set<number>>(() => new Set(initial));
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      `${item.label} ${item.hint ?? ""}`.toLowerCase().includes(needle),
    );
  }, [items, filter]);

  function toggle(itemId: number) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  return (
    // min-w-0: a fieldset is as wide as its content by default, and a long
    // name pushed the list past the edge of the panel.
    <fieldset className="min-w-0">
      <legend className="muted mb-1 flex w-full items-baseline justify-between gap-2 text-xs font-medium">
        <span>{label}</span>
        {chosen.size > 0 && (
          <span className="tabular-nums">
            {t("meeting.selected").replace("{n}", String(chosen.size))}
          </span>
        )}
      </legend>

      {/* Below eight rows the whole list fits in the box; a filter would be
          one more control that does nothing useful. */}
      {items.length > 8 && (
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={t("common.search")}
          aria-label={`${label}: ${t("common.search")}`}
          className={`${FIELD} mb-1.5`}
        />
      )}

      <div className="scroll-thin max-h-48 overflow-y-auto rounded-xl border">
        {visible.map((item) => {
          const inputId = `${id}-${item.id}`;
          return (
            <label
              key={item.id}
              htmlFor={inputId}
              className="flex min-h-10 cursor-pointer items-center gap-2.5 border-b px-3 py-2 text-sm transition duration-150 last:border-b-0 hover:bg-[var(--surface)]"
            >
              <input
                id={inputId}
                type="checkbox"
                name={name}
                value={item.id}
                checked={chosen.has(item.id)}
                onChange={() => toggle(item.id)}
                className="size-4 shrink-0 accent-[var(--ink)]"
              />
              <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                {item.hint && (
                  <span className="muted block truncate text-[11px]">
                    {item.hint}
                  </span>
                )}
              </span>
            </label>
          );
        })}
        {visible.length === 0 && (
          <p className="muted px-3 py-3 text-xs">{t("common.noData")}</p>
        )}
      </div>

      {/* A chosen row the filter hides must still be sent with the form. */}
      {[...chosen]
        .filter((itemId) => !visible.some((item) => item.id === itemId))
        .map((itemId) => (
          <input key={itemId} type="hidden" name={name} value={itemId} />
        ))}
    </fieldset>
  );
}
