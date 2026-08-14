"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";

/**
 * The panel's own sign-in. Nothing here touches the users table: these
 * credentials come from the server environment, so an employee password —
 * even the chairman's — does not open this door.
 */
export function AdminLoginForm({ configured }: { configured: boolean }) {
  const t = useT();
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!login.trim() || !password) {
      setError(t("login.empty"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          data.error === "RATE_LIMIT"
            ? t("login.rateLimit")
            : data.error === "NOT_CONFIGURED"
              ? t("admin.notConfigured")
              : t("login.error"),
        );
        setBusy(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError(t("common.error"));
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-gold-500/60 focus:ring-4 focus:ring-gold-500/15";

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-2xl font-bold text-white">{t("admin.signIn")}</h1>
      <p className="text-sm text-white/50">{t("admin.signInHint")}</p>

      {!configured && (
        <p className="rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-amber-200">
          {t("admin.notConfigured")}
        </p>
      )}

      <div>
        <label
          htmlFor="admin-login"
          className="mb-1.5 block text-sm font-medium text-white/80"
        >
          {t("admin.login")}
        </label>
        <input
          id="admin-login"
          name="admin-login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className={`${field} font-mono`}
          autoComplete="username"
          autoFocus
        />
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="mb-1.5 block text-sm font-medium text-white/80"
        >
          {t("admin.password")}
        </label>
        <input
          id="admin-password"
          name="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
          autoComplete="current-password"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-gold-500 py-3 text-sm font-bold text-navy-950 transition hover:bg-gold-400 disabled:opacity-60"
      >
        {busy ? t("login.loading") : t("login.submit")}
      </button>

      <p className="pt-2 text-center text-xs text-white/35">
        {t("admin.separateNote")}
      </p>
    </form>
  );
}
