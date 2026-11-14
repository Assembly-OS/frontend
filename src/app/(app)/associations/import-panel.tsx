"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Button, FIELD, Panel } from "@/components/ui";
import type { MessageKey } from "@/lib/i18n";

/**
 * The fifty associations from the Assembly's reference list, as a CSV
 * (TZ 6.1). Names already in the base are updated, so the file can be
 * corrected and sent again; the result says how many of each.
 */
export function ImportPanel() {
  const t = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/associations/import", { method: "POST", body: form });
      const data = (await response.json()) as {
        created?: number;
        updated?: number;
        skipped?: string[];
        error?: string;
      };
      if (!response.ok) {
        const key = `assoc.import.error.${data.error ?? ""}` as MessageKey;
        setError(data.error === "EMPTY" || data.error === "HEADER" ? t(key) : t("common.error"));
        return;
      }
      setResult({ created: data.created ?? 0, updated: data.updated ?? 0, skipped: data.skipped?.length ?? 0 });
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={t("assoc.import.title")}>
      <p className="muted border-b px-5 py-3 text-xs [overflow-wrap:anywhere]">{t("assoc.import.hint")}</p>
      <form className="flex flex-wrap items-end gap-3 p-5" onSubmit={submit}>
        <label className="block min-w-0 flex-1">
          <span className="muted mb-1 block text-xs font-medium">{t("assoc.import.pick")}</span>
          <input ref={input} type="file" accept=".csv,text/csv,text/plain" required className={FIELD} />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? t("common.loading") : t("assoc.import.submit")}
        </Button>
        {result && (
          <p className="w-full text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {t("assoc.import.done")
              .replace("{created}", String(result.created))
              .replace("{updated}", String(result.updated))}
            {result.skipped > 0 ? ` · ${t("assoc.import.skipped").replace("{n}", String(result.skipped))}` : ""}
          </p>
        )}
        {error && (
          <p role="alert" className="w-full text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
      </form>
    </Panel>
  );
}
