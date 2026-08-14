"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/icons";
import { Button, FIELD } from "@/components/ui";

/**
 * Changing your own password.
 *
 * Two things here are not decoration. The new password is typed twice, because
 * the field is masked and a typo would otherwise be discovered at the next
 * login, by which point the person is locked out of a system they cannot reset
 * themselves. And the whole form can be unmasked, because someone handed
 * `gulrux2026` and asked to replace it will be typing on a phone, where a
 * masked field is where good passwords go to become typos.
 */
export function PasswordForm() {
  const t = useT();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [repeat, setRepeat] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const tooShort = newPassword.length > 0 && newPassword.length < 6;
  const mismatch = repeat.length > 0 && repeat !== newPassword;
  const ready =
    oldPassword.length > 0 && newPassword.length >= 6 && repeat === newPassword;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ ok: false, text: t("profile.passwordShort") });
      return;
    }
    if (newPassword !== repeat) {
      setMessage({ ok: false, text: t("profile.passwordMismatch") });
      return;
    }
    if (newPassword === oldPassword) {
      setMessage({ ok: false, text: t("profile.passwordSame") });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (response.ok) {
        setOld("");
        setNew("");
        setRepeat("");
        setVisible(false);
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
    } catch {
      setMessage({ ok: false, text: t("profile.passwordError") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-5">
      <label className="block">
        <span className="muted mb-1 block text-xs font-medium">
          {t("profile.oldPassword")}
        </span>
        <input
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOld(e.target.value)}
          className={FIELD}
        />
      </label>

      <label className="block">
        <span className="muted mb-1 block text-xs font-medium">
          {t("profile.newPassword")}
        </span>
        <input
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className={`${FIELD} ${tooShort ? "border-amber-500" : ""}`}
        />
        <span className="muted mt-1 block text-[11px]">
          {t("profile.passwordRule")}
        </span>
      </label>

      <label className="block">
        <span className="muted mb-1 block text-xs font-medium">
          {t("profile.confirmPassword")}
        </span>
        <input
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          className={`${FIELD} ${mismatch ? "border-rose-500" : ""}`}
        />
        {/* Said while it can still be fixed, not after the form is submitted. */}
        {mismatch && (
          <span className="mt-1 block text-[11px] font-medium text-rose-600 dark:text-rose-400">
            {t("profile.passwordMismatch")}
          </span>
        )}
      </label>

      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        className="muted flex items-center gap-1.5 text-xs font-medium transition hover:opacity-70"
      >
        <Icon name={visible ? "eyeOff" : "eye"} className="size-3.5" />
        {visible ? t("profile.hidePassword") : t("profile.showPassword")}
      </button>

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

      <Button type="submit" block disabled={busy || !ready}>
        {busy ? t("common.loading") : t("profile.changePassword")}
      </Button>
    </form>
  );
}
