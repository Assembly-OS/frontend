"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";

export function PasswordForm() {
  const t = useT();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ ok: false, text: t("profile.passwordShort") });
      return;
    }
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    setBusy(false);
    if (response.ok) {
      setOld("");
      setNew("");
      setMessage({ ok: true, text: t("profile.passwordChanged") });
      return;
    }
    const data = (await response.json()) as { error?: string };
    setMessage({
      ok: false,
      text:
        data.error === "SHORT"
          ? t("profile.passwordShort")
          : t("profile.passwordError"),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-5">
      <label className="block">
        <span className="muted mb-1 block text-xs font-medium">
          {t("profile.oldPassword")}
        </span>
        <input
          type="password"
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOld(e.target.value)}
          className="w-full rounded-xl border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-navy-500"
        />
      </label>

      <label className="block">
        <span className="muted mb-1 block text-xs font-medium">
          {t("profile.newPassword")}
        </span>
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className="w-full rounded-xl border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-navy-500"
        />
      </label>

      {message && (
        <p
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            message.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60 dark:bg-navy-600 dark:hover:bg-navy-500"
      >
        {busy ? t("common.loading") : t("profile.changePassword")}
      </button>
    </form>
  );
}
