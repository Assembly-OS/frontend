"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_SHORT } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";

export function LocaleSwitcher({
  current,
  tone = "light",
}: {
  current: Locale;
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function change(locale: Locale) {
    if (locale === current) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    startTransition(() => router.refresh());
  }

  const base =
    tone === "dark"
      ? "border-white/15 bg-white/5 text-white/70"
      : "border-[var(--line)] bg-[var(--panel)] muted";
  const active =
    tone === "dark"
      ? "bg-white text-navy-900"
      : "bg-navy-900 text-white dark:bg-navy-100 dark:text-navy-950";

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${base} ${
        pending ? "opacity-60" : ""
      }`}
    >
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => change(locale)}
          aria-pressed={locale === current}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            locale === current ? active : "hover:opacity-100 opacity-70"
          }`}
        >
          {LOCALE_SHORT[locale]}
        </button>
      ))}
    </div>
  );
}
