"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!login.trim() || !pass) {
      setError(t("login.empty"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password: pass }),
      });
      if (!response.ok) {
        setError(
          response.status === 429 ? t("login.rateLimit") : t("login.error"),
        );
        setBusy(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(t("common.error"));
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label
            htmlFor="login"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("login.login")}
          </label>
          <input
            id="login"
            name="login"
            autoComplete="username"
            autoFocus
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="rais"
            className="w-full rounded-xl border bg-[var(--panel)] px-3.5 py-2.5 text-sm outline-none transition hover:border-navy-400/60 focus:border-navy-500 focus:ring-4 focus:ring-navy-500/15"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("login.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border bg-[var(--panel)] px-3.5 py-2.5 text-sm outline-none transition hover:border-navy-400/60 focus:border-navy-500 focus:ring-4 focus:ring-navy-500/15"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="shadow-soft w-full rounded-xl bg-gradient-to-b from-navy-800 to-navy-900 px-4 py-3 text-sm font-semibold text-white transition duration-150 hover:-translate-y-0.5 hover:from-navy-700 hover:to-navy-800 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-500/30 active:translate-y-0 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none dark:from-navy-600 dark:to-navy-700 dark:hover:from-navy-500 dark:hover:to-navy-600"
        >
          {busy ? t("login.loading") : t("login.submit")}
        </button>
      </form>
    </div>
  );
}
