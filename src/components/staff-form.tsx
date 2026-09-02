"use client";

import { useT } from "@/components/i18n-provider";
import { Button, FIELD, Select } from "@/components/ui";
import { DEPARTMENTS, ROLES, type Role } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";

/**
 * The one staff form, worn by both "add" and "edit", and by both places that
 * administer accounts — the `/admin` panel and the staff section on the
 * profile page. A second copy would have drifted within a week: they ask for
 * the same nine things because a colleague has the same nine things.
 */

export interface StaffValues {
  fullName: string;
  login: string;
  password: string;
  role: Role;
  department: string;
  position: string;
  managerId: string;
  phone: string;
  email: string;
}

export const EMPTY_STAFF: StaffValues = {
  fullName: "",
  login: "",
  password: "",
  role: "ISHCHI",
  department: "",
  position: "",
  managerId: "",
  phone: "",
  email: "",
};

/** Readable random password — no look-alike glyphs to mistype over the phone. */
export function newPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** A login the server will accept, checked as it is typed. */
const LOGIN_SHAPE = /^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])$/;

export function StaffForm({
  mode,
  values,
  managers,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  values: StaffValues;
  managers: { id: number; label: string }[];
  busy: boolean;
  onChange: (next: StaffValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const set = <K extends keyof StaffValues>(key: K, value: StaffValues[K]) =>
    onChange({ ...values, [key]: value });

  const label = "mb-1.5 block text-sm font-medium";
  // Said while it can still be fixed, rather than after the form comes back.
  const badLogin =
    mode === "create" && values.login.length > 0 && !LOGIN_SHAPE.test(values.login);
  const shortPassword =
    mode === "create" && values.password.length > 0 && values.password.length < 8;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid grid-cols-[minmax(0,1fr)] gap-4 p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label className={label} htmlFor="fullName">
          {t("admin.fullName")} *
        </label>
        <input
          id="fullName"
          value={values.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          className={FIELD}
          autoComplete="off"
          required
        />
      </div>

      {/* A login is an identity other rows point at, so it is set once. */}
      {mode === "create" && (
        <>
          <div>
            <label className={label} htmlFor="login">
              {t("admin.login")} *
            </label>
            <input
              id="login"
              value={values.login}
              onChange={(e) => set("login", e.target.value.toLowerCase())}
              className={`${FIELD} font-mono ${badLogin ? "border-amber-500" : ""}`}
              placeholder="ism.familiya"
              autoComplete="off"
              required
            />
            {badLogin && (
              <span className="mt-1 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {t("admin.errLogin")}
              </span>
            )}
          </div>
          <div>
            <label className={label} htmlFor="password">
              {t("admin.password")} *
            </label>
            <div className="flex gap-2">
              <input
                id="password"
                value={values.password}
                onChange={(e) => set("password", e.target.value)}
                className={`${FIELD} font-mono ${
                  shortPassword ? "border-amber-500" : ""
                }`}
                autoComplete="new-password"
                required
              />
              <Button
                variant="secondary"
                onClick={() => set("password", newPassword())}
              >
                {t("admin.generate")}
              </Button>
            </div>
            {shortPassword && (
              <span className="mt-1 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {t("admin.errWeak")}
              </span>
            )}
          </div>
        </>
      )}

      <div>
        <label className={label} htmlFor="role">
          {t("admin.role")}
        </label>
        <Select
          id="role"
          value={values.role}
          onChange={(e) => set("role", e.target.value as Role)}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`role.${role}` as MessageKey)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className={label} htmlFor="department">
          {t("admin.department")}
        </label>
        <Select
          id="department"
          value={values.department}
          onChange={(e) => set("department", e.target.value)}
        >
          <option value="">{t("admin.noDepartment")}</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>
              {t(`dept.${dept}` as MessageKey)}
            </option>
          ))}
        </Select>
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor="position">
          {t("admin.position")}
        </label>
        <input
          id="position"
          value={values.position}
          onChange={(e) => set("position", e.target.value)}
          className={FIELD}
          placeholder="GR bo'limi bosh mutaxassisi"
          autoComplete="off"
        />
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor="managerId">
          {t("admin.manager")}
        </label>
        <Select
          id="managerId"
          value={values.managerId}
          onChange={(e) => set("managerId", e.target.value)}
        >
          <option value="">{t("admin.noManager")}</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className={label} htmlFor="phone">
          {t("admin.phone")}
        </label>
        <input
          id="phone"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          className={FIELD}
          autoComplete="off"
          inputMode="tel"
        />
      </div>

      <div>
        <label className={label} htmlFor="email">
          {t("admin.email")}
        </label>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          className={FIELD}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy
            ? t("admin.creating")
            : mode === "create"
              ? t("admin.create")
              : t("admin.save")}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t("admin.cancel")}
        </Button>
      </div>
    </form>
  );
}
