"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { loadTelegram } from "@/components/telegram-init";

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * `checking` while Telegram's signature is being tried, `link` once it has
   * come back saying this account is not attached to anyone yet, `form` for an
   * ordinary browser. The three are separate because they want three
   * different screens: a wait, a one-time explanation, and the plain login.
   */
  const [mode, setMode] = useState<"form" | "checking" | "link">("form");
  const initData = useRef("");

  useEffect(() => {
    let cancelled = false;

    void loadTelegram().then(async (app) => {
      if (cancelled || !app?.initData) return;
      initData.current = app.initData;
      setMode("checking");
      try {
        // No login, no password: if this Telegram account is already attached
        // to somebody, the signature Telegram put on `initData` is the whole
        // credential and the person never sees a form.
        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: app.initData }),
        });
        if (cancelled) return;
        if (response.ok) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }
        // 428 is the expected first launch — ask once, then never again.
        setMode(response.status === 428 ? "link" : "form");
      } catch {
        if (!cancelled) setMode("form");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!login.trim() || !pass) {
      setError(t("login.empty"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Inside Telegram the same credentials go to the Telegram route, which
      // signs in *and* records the link — so this is the last time this
      // person types a password on this phone.
      const inTelegram = mode === "link" && initData.current;
      const response = await fetch(
        inTelegram ? "/api/auth/telegram" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: login.trim(),
            password: pass,
            ...(inTelegram ? { initData: initData.current } : {}),
          }),
        },
      );
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

  if (mode === "checking") {
    return (
      <div className="w-full max-w-sm">
        <p className="muted flex items-center justify-center gap-2 py-8 text-sm">
          <span className="size-1.5 animate-pulse rounded-full bg-current" />
          {t("login.telegramChecking")}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {mode === "link" && (
        <p className="mb-4 rounded-xl bg-navy-500/10 px-3.5 py-2.5 text-sm">
          {t("login.telegramLink")}
        </p>
      )}
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
